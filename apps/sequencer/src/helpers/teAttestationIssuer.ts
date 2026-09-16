import { keccak256 } from '@ethersproject/keccak256';
import snapshot from '@snapshot-labs/snapshot.js';
import { getProposal } from './actions';
import {
  GegAttestationError,
  mintAttestation,
  verifyAttestation
} from './gegAttestation';
import log from './log';
import db from './mysql';
import { isDustVotingPower, isWithinGegVotingWindow } from './te';
import { parseCommitteeSnapshotLoose } from './teCommittee';
import { jsonParse } from './utils';

const scoreAPIUrl = process.env.SCORE_API_URL || 'https://score.snapshot.org';

export class TeIssueError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/**
 * The pseudonym for a voter on a proposal: `keccak(voter ‖ proposalId)`.
 *
 * Derived rather than accepted: the request names a voter, and the pseudonym
 * follows from that address alone, so a caller cannot ask for a credential under
 * a pseudonym unrelated to the address they named. Must stay byte-identical to
 * `apps/ui/src/helpers/teBallot.ts::pseudonymFor` — the ballot carries the
 * browser's copy, and ingest compares both against the authenticated voter.
 */
export function pseudonymFor(voter: string, proposalId: string): string {
  const voterBytes = Buffer.from(voter.toLowerCase().replace(/^0x/, ''), 'hex');
  const idBytes = Buffer.from(proposalId.replace(/^0x/, ''), 'hex');
  return keccak256(Buffer.concat([voterBytes, idBytes]));
}

/**
 * The next re-vote counter for this voter on this proposal.
 *
 * Strictly increasing and durable, because the committee ranks a voter's
 * duplicate ballots by `(nonce, sequenceNumber)`: a counter that regressed after
 * a restart would let a stale ballot outrank a genuine re-vote.
 *
 * `LAST_INSERT_ID(last + 1)` is MySQL's atomic read-modify-write, but it reports
 * through *session* state — so the read-back has to happen on the same
 * connection as the write. Going through the pool for both statements does not:
 * the SELECT can land on another connection and return some other request's
 * value, or none. That is not a rare interleaving either. Eight concurrent
 * callers returned three distinct nonces before this took a connection of its
 * own, which in production is several voters sharing a nonce and a re-vote order
 * that depends on which ballot the tally happens to see first.
 */
export async function nextRevoteNonce(
  proposalId: string,
  pseudonym: string
): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const connection = await (db as any).getConnectionAsync();
  try {
    await connection.queryAsync(
      `INSERT INTO te_revote_nonces (proposal_id, pseudonym, last, updated)
       VALUES (?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE last = LAST_INSERT_ID(last + 1), updated = ?`,
      [proposalId, pseudonym, now, now]
    );
    const [row] = await connection.queryAsync(
      'SELECT LAST_INSERT_ID() AS n, ROW_COUNT() AS affected'
    );
    // A first insert does not set LAST_INSERT_ID from the expression — only the
    // UPDATE branch does — so `affected === 1` means "row created", nonce 1.
    return Number(row?.affected) === 1 ? 1 : Number(row?.n);
  } finally {
    connection.release();
  }
}

export interface IssuedCredential {
  scheme: 'ATTESTATION_V1';
  electionId: string;
  pseudonym: string;
  vk: string;
  weight: number;
  nonce: number;
  signature: string;
}

export interface IssueResult {
  attestation: IssuedCredential;
  /** What the voter actually holds, before the cap — shown so the clamp is visible. */
  votingPower: number;
}

export async function issueBallotCredential(args: {
  space: string;
  proposalId: string;
  vk: string;
  /** The address whose voting power the credential will carry. */
  voter: string;
}): Promise<IssueResult> {
  const { space, proposalId, vk, voter } = args;

  if (typeof space !== 'string' || !space)
    throw new TeIssueError('space: expected a space id', 400);
  if (typeof proposalId !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(proposalId))
    throw new TeIssueError('proposalId: expected a 32-byte hex id', 400);
  if (typeof vk !== 'string' || !/^0x[0-9a-fA-F]{96}$/.test(vk))
    throw new TeIssueError('vk: expected 48 bytes of hex', 400);
  if (typeof voter !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(voter))
    throw new TeIssueError('voter: expected an address', 400);

  const now = Math.floor(Date.now() / 1000);

  // Keyed on (space, id) like every other read here; a mismatched space simply
  // does not resolve, which is the same answer as an unknown proposal.
  const proposal = await getProposal(space, proposalId);
  if (!proposal) throw new TeIssueError('unknown proposal', 404);
  if (proposal.privacy !== 'shutter-elgamal')
    throw new TeIssueError('proposal is not private', 404);
  if (!proposal.te_mpk)
    throw new TeIssueError(
      'the committee has not finished key generation',
      409
    );

  // The same half-open window ingest enforces, so a credential is never issued
  // for a ballot that would be refused the moment it is cast.
  if (!isWithinGegVotingWindow(now, proposal.start, proposal.end))
    throw new TeIssueError('voting is not open for this proposal', 422);

  const teConfig =
    typeof proposal.te_config === 'string'
      ? jsonParse(proposal.te_config, null)
      : proposal.te_config;
  const budget = Number(teConfig?.budget);
  if (!Number.isInteger(budget) || budget < 1)
    throw new TeIssueError('proposal has no usable ballot budget', 503);

  let vp: any;
  try {
    vp = await snapshot.utils.getVp(
      voter,
      proposal.network,
      proposal.strategies,
      proposal.snapshot,
      proposal.space,
      false,
      { url: scoreAPIUrl }
    );
  } catch (err: any) {
    log.warn(`[te-issue] voting power lookup failed: ${err?.message || err}`);
    throw new TeIssueError('could not determine voting power', 503);
  }

  if (!vp || vp.vp === 0) throw new TeIssueError('no voting power', 403);
  // Both rules move here from ingest, because they decide the weight and the
  // weight is about to be signed. Refusing dust at issuance also means the voter
  // is told before they are asked for a second signature, rather than after.
  if (isDustVotingPower(vp.vp)) {
    throw new TeIssueError(
      'voting power too low for a private proposal, must be at least 0.5',
      403
    );
  }

  // The credential carries voting power **as held**, not capped.
  //
  // This used to clamp at `floor(1e6 / budget)` — 10,000 at the default weighted
  // budget — so a holder of 25,000 and one of 25,000,000 voted identically, which
  // flattened the top of every cap table it touched. Keeping the tally computable is
  // now the scale factor's job (`scale` in the election config), and scaling divides
  // everyone rather than truncating some, so every ratio survives.
  const weight = BigInt(Math.round(vp.vp));

  // Alarm, not a gate (H9).
  //
  // `V` is an estimate frozen at creation, and `s` was chosen from it. If real
  // turnout exceeds it, the tally is sized for a smaller bound than it will actually
  // face — recoverable by giving the coordinator more memory, but only if someone
  // knows before the tally runs. Refusing the vote instead would disenfranchise a
  // voter for an operator's estimate being wrong, so this reports and lets them vote.
  try {
    const bound = parseCommitteeSnapshotLoose(
      proposal.te_geg_config
    )?.maxTotalWeight;
    if (bound) {
      const [row] = await db.queryAsync(
        'SELECT COALESCE(SUM(vp), 0) AS total FROM votes WHERE proposal = ?',
        [proposalId]
      );
      const attested = Number(row?.total ?? 0) + Number(weight);
      if (attested > bound) {
        log.warn(
          `[te-vpbound] ${proposalId}: attested weight ${attested} has passed the ` +
            `frozen bound ${bound}. The scale was chosen from that bound, so the ` +
            `tally may exceed what the coordinator is sized for — raise ` +
            `TE_SOLVER_CEILING and its memory before the tally runs.`
        );
      }
    }
  } catch (err: any) {
    // Diagnostics must never block issuance.
    log.warn(
      `[te-vpbound] ${proposalId}: bound check skipped: ${err?.message || err}`
    );
  }

  const pseudonym = pseudonymFor(voter, proposalId);
  const nonce = BigInt(await nextRevoteNonce(proposalId, pseudonym));

  const mintArgs = { electionId: proposalId, pseudonym, vk, weight, nonce };
  let credentialSig: string;
  try {
    credentialSig = await mintAttestation(mintArgs);
    // Verify what we just signed. Not distrust of our own key: the same rule as
    // the dust floor and the window — do not hand out what the committee will
    // drop, or the voter signs a credential that excludes their ballot at tally.
    if (
      !(await verifyAttestation({
        ...mintArgs,
        signature: credentialSig
      }))
    ) {
      throw new GegAttestationError(
        'freshly minted credential failed verification'
      );
    }
  } catch (err: any) {
    if (err instanceof GegAttestationError) {
      log.warn(`[te-issue] cannot mint credential: ${err.message}`);
      throw new TeIssueError(`private voting unavailable: ${err.message}`, 503);
    }
    throw err;
  }

  log.info(`[te-issue] proposal=${proposalId} weight=${weight} nonce=${nonce}`);

  return {
    attestation: {
      scheme: 'ATTESTATION_V1',
      electionId: proposalId,
      pseudonym,
      vk,
      weight: Number(weight),
      nonce: Number(nonce),
      signature: credentialSig
    },
    votingPower: vp.vp
  };
}
