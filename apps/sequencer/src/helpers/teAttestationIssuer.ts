import snapshot from '@snapshot-labs/snapshot.js';
import { getProposal } from './actions';
import log from './log';
import db from './mysql';
import { mintAttestation, SgpAttestationError } from './sgpAttestation';
import {
  expectedPseudonym,
  isDustVotingPower,
  isWithinSgpVotingWindow
} from './te';
import { parseCommitteeSnapshotLoose } from './teCommittee';

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
 * The next re-vote counter for this voter on this proposal. It is stored in the
 * database and only ever increases, because the committee ranks a voter's ballots
 * by `(nonce, sequenceNumber)` to pick the latest.
 *
 * `LAST_INSERT_ID(last + 1)` is an atomic increment, but its value is per
 * connection, so both statements must run on the same connection, not the pool.
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
    // Only the UPDATE branch sets LAST_INSERT_ID, so `affected === 1` means the
    // row was just created and the nonce is 1.
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
  /** The voter's voting power before rounding to the integer `weight`. */
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

  if (typeof space !== 'string' || !space) {
    throw new TeIssueError('space: expected a space id', 400);
  }
  if (
    typeof proposalId !== 'string' ||
    !/^0x[0-9a-fA-F]{64}$/.test(proposalId)
  ) {
    throw new TeIssueError('proposalId: expected a 32-byte hex id', 400);
  }
  if (typeof vk !== 'string' || !/^0x[0-9a-fA-F]{96}$/.test(vk)) {
    throw new TeIssueError('vk: expected 48 bytes of hex', 400);
  }
  if (typeof voter !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(voter)) {
    throw new TeIssueError('voter: expected an address', 400);
  }

  const now = Math.floor(Date.now() / 1000);

  // A proposal from a different space is not found, same as an unknown id.
  const proposal = await getProposal(space, proposalId);
  if (!proposal) throw new TeIssueError('unknown proposal', 404);
  if (proposal.privacy !== 'shutter-elgamal') {
    throw new TeIssueError('proposal is not private', 404);
  }
  if (!proposal.te_mpk) {
    throw new TeIssueError(
      'the committee has not finished key generation',
      409
    );
  }

  // Same window check as ingest, so no credential is issued for a ballot that
  // ingest would refuse.
  if (!isWithinSgpVotingWindow(now, proposal.start, proposal.end)) {
    throw new TeIssueError('voting is not open for this proposal', 422);
  }

  // Already parsed by getProposal.
  const teConfig = proposal.te_config;
  const budget = Number(teConfig?.budget);
  if (!Number.isInteger(budget) || budget < 1) {
    throw new TeIssueError('proposal has no usable ballot budget', 503);
  }

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
  // Checked here, before the weight is signed, so the voter learns of it before
  // being asked for a second signature.
  if (isDustVotingPower(vp.vp)) {
    throw new TeIssueError(
      'voting power too low for a private proposal, must be at least 0.5',
      403
    );
  }

  // The weight is the full voting power, not capped. Keeping the tally solvable is
  // done by `scale` in the election config, which divides everyone equally.
  const weight = BigInt(Math.round(vp.vp));
  // The weight is sent as a JSON number, which is not exact above 2^53 (and from
  // 1e21 is written as `1e+21`, which keypers drop). Refused before the voter signs.
  if (weight > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new TeIssueError(
      'voting power too large for a private ballot (above 2^53)',
      422
    );
  }

  // Warning only; the vote is still allowed. `s` was chosen from the voting power
  // bound frozen at creation, and if turnout exceeds it the tally may need more
  // coordinator memory than planned. This logs a warning so an operator can fix it
  // before the tally runs.
  //
  // It compares `budget × ceil(total / s)` with the frozen ceiling, not the total
  // with `V`, because a fallback `V` is too low for non-weighted types.
  try {
    const ceiling = parseCommitteeSnapshotLoose(
      proposal.te_sgp_config
    )?.solverCeiling;
    if (ceiling) {
      const [row] = await db.queryAsync(
        'SELECT COALESCE(SUM(vp), 0) AS total FROM votes WHERE proposal = ?',
        [proposalId]
      );
      const attested = Number(row?.total ?? 0) + Number(weight);
      const scale = Number(teConfig?.scale) || 1;
      if (budget * Math.ceil(attested / scale) > ceiling) {
        log.warn(
          `[te-vpbound] ${proposalId}: attested weight ${attested} at scale ` +
            `${scale} and budget ${budget} has passed the frozen solver ceiling ` +
            `${ceiling}, so the tally may exceed what the coordinator is sized ` +
            `for — raise TE_SOLVER_CEILING and its memory before the tally runs.`
        );
      }
    }
  } catch (err: any) {
    // Diagnostics must never block issuance.
    log.warn(
      `[te-vpbound] ${proposalId}: bound check skipped: ${err?.message || err}`
    );
  }

  // Derived from the address, not taken from the request, so a caller cannot pick
  // an unrelated pseudonym.
  const pseudonym = expectedPseudonym(voter, proposalId);
  const nonce = BigInt(await nextRevoteNonce(proposalId, pseudonym));

  let credentialSig: string;
  try {
    credentialSig = await mintAttestation({
      electionId: proposalId,
      pseudonym,
      vk,
      weight,
      nonce
    });
  } catch (err: any) {
    if (err instanceof SgpAttestationError) {
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
