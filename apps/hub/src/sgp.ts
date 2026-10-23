/**
 * Endpoints that serve Snapshot data in the threshold protocol's (SGP) shapes, for
 * the keypers and coordinator via te-data-layer. Reads are public. Keyper and
 * role-key writes are authorised by their signatures.
 *
 * Kept separate from `te.ts`, whose shapes are used by the UI audit panel.
 */

import {
  G2Point,
  initCurves,
  Transcript,
  verifyDecryptionShare
} from '@shutter-network/urban-verified-crypto';
import { capture } from '@snapshot-labs/snapshot-sentry';
import express from 'express';
import {
  parseJsonPreservingBigInts,
  stringifyPreservingBigInts
} from './helpers/bigIntJson';
import {
  EligibilityKeyError,
  eligibilityPublicKey
} from './helpers/eligibilityKey';
import log from './helpers/log';
import db from './helpers/mysql';
import { canonicalAggregate, canonicalPoint } from './helpers/sgpAggregate';
import {
  composeElectionConfig,
  parseCommitteeSnapshot,
  SgpConfigError
} from './helpers/sgpConfig';
import {
  aggregateDigest,
  decryptionShareDigest,
  dkgResultDigest,
  recoverDigestSigner,
  requestDigest,
  requestNoncePayload,
  resultDigest,
  SgpDigestError
} from './helpers/sgpDigests';
import { parseJsonField, sendError } from './helpers/utils';

const router = express.Router();

/**
 * Largest ballot page, in rows. Matches the protocol's `BALLOT_PAGE` and the
 * reference data layer's `MAX_BALLOT_PAGE`. A client asking for more gets a short
 * page; its read loop advances by the rows received.
 */
const MAX_BALLOT_PAGE = 1000;

/**
 * Largest ballot page, in stored envelope bytes. Matches the reference data
 * layer's `MAX_BALLOT_PAGE_BYTES`.
 *
 * An envelope is ~120-160 KB at budget 100 and over 1 MB at the
 * `MAX_PROOF_BRANCHES` limit, so 1000 rows would be too large to build and forward
 * within te-data-layer's 10 s timeout. A page always has at least one ballot, so
 * a single envelope above the cap is still served.
 */
const MAX_BALLOT_PAGE_BYTES = 8 * 1024 * 1024;

/**
 * How far (in seconds) a stall/resume request's `issuedAt` may be from the hub's
 * clock. Allows normal clock skew while limiting how long a captured signature can
 * be replayed.
 */
const REQUEST_FRESHNESS_S = 300;

/** How many proposals one `list` response may name. */
const LIST_LIMIT = 500;

/** Loads a private proposal, or answers 404 and returns null. */
async function loadProposal(proposalId: string, res: any): Promise<any | null> {
  const [proposal] = await (db as any).queryAsync(
    `SELECT id, privacy, type, choices, start, end, author, space, te_mpk,
            te_committee_pks, te_sgp_config, te_config, te_tally_stalled,
            te_tally_stall_reason
       FROM proposals WHERE id = ? LIMIT 1`,
    [proposalId]
  );
  if (!proposal) {
    sendError(res, 'proposal_not_found', 404);
    return null;
  }
  if (proposal.privacy !== 'shutter-elgamal') {
    sendError(res, 'proposal_not_private', 404);
    return null;
  }
  return proposal;
}

/** The proposal's frozen committee, or answers 503 and returns null. */
function committeeFor(
  proposal: any,
  res: any
): ReturnType<typeof parseCommitteeSnapshot> | null {
  try {
    return parseCommitteeSnapshot(proposal.te_sgp_config);
  } catch (err: any) {
    // Without a committee no write can be authorised.
    log.error(`[sgp] ${proposal.id}: ${err.message}`);
    sendError(res, 'committee_not_configured', 503);
    return null;
  }
}

/** The signer's 0-based position in the committee, or -1 for a non-member. */
function keyperIndexOf(
  snapshot: ReturnType<typeof parseCommitteeSnapshot>,
  signer: string | null
): number {
  if (!signer) return -1;
  return snapshot.keypers.findIndex(
    k => k.address.toLowerCase() === signer.toLowerCase()
  );
}

/**
 * Proposals the coordinator can still act on, not the full history (it polls this
 * and reads each entry). Lists proposals awaiting key generation first, then those
 * with a key until their scores are final.
 *
 * A proposal with no key after voting starts has failed DKG (`dkg_failed` in
 * GraphQL) and is left out, and so is a stalled tally until an admin resumes it,
 * so neither can push new ones past the limit.
 */
router.get('/te_sgp_elections', async (req, res) => {
  try {
    const now = Math.floor(Date.now() / 1e3);
    const rows = await (db as any).queryAsync(
      `SELECT id FROM proposals
        WHERE privacy = 'shutter-elgamal'
          AND te_sgp_config IS NOT NULL
          AND (te_mpk IS NOT NULL OR start >= ?)
          AND (scores_state IS NULL OR scores_state != 'final')
          AND te_tally_stalled = 0
        ORDER BY te_mpk IS NULL DESC, start ASC
        LIMIT ?`,
      [now, LIST_LIMIT]
    );
    return res.json({ electionIds: (rows as any[]).map(r => r.id) });
  } catch (err: any) {
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/**
 * One election: its config plus the state the protocol needs. `cancelled` is
 * always false: Snapshot has no cancellation, and a deleted proposal is a 404.
 */
router.get('/proposal/:id/te_sgp_election', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId, res);
    if (!proposal) return;

    let config;
    try {
      config = composeElectionConfig({
        proposalId,
        choices: parseJsonField<string[]>(proposal.choices, []),
        type: proposal.type,
        snapshot: parseCommitteeSnapshot(proposal.te_sgp_config),
        currentEligibilityKey: await eligibilityPublicKey()
      });
    } catch (err: any) {
      if (err instanceof SgpConfigError || err instanceof EligibilityKeyError) {
        log.error(`[sgp] ${proposalId}: ${err.message}`);
        return sendError(res, err.message, 503);
      }
      throw err;
    }

    const ingestConfig = parseJsonField<any>(proposal.te_config, null);
    const ingestBudget = Number(ingestConfig?.budget);
    if (ingestBudget !== config.budget) {
      log.error(
        `[sgp] ${proposalId}: ballot budget disagrees — te_config says ${ingestConfig?.budget}, ` +
          `the committee config says ${config.budget}`
      );
      return sendError(
        res,
        `ballot budget mismatch: ballots are built to ${ingestConfig?.budget} but the ` +
          `committee would verify against ${config.budget}; every ballot would be ` +
          'rejected as INVALID_PROOF',
        500
      );
    }

    const committeePks = parseJsonField<string[] | null>(
      proposal.te_committee_pks,
      null
    );
    // te_mpk is written when the committee reaches quorum on the DKG result.
    const finalizedKey =
      proposal.te_mpk && committeePks?.length
        ? {
            pkElection: `0x${Buffer.from(proposal.te_mpk).toString('hex')}`,
            committeePKs: committeePks
          }
        : null;

    return res.json({
      config,
      cancelled: false,
      // The coordinator does not drive a stalled election until this clears.
      tallyStalled: Boolean(proposal.te_tally_stalled),
      // The coordinator's explanation, unsigned and unverified; the UI shows it
      // as such. The UI's own diagnosis comes from share counts (`diagnoseTally`).
      tallyStallReason: proposal.te_tally_stall_reason ?? null,
      finalizedKey
    });
  } catch (err: any) {
    log.error(`[sgp] te_sgp_election ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/**
 * Stored ballots as protocol ballot envelopes, one page at a time.
 *
 * Ordering: ballots are ordered by `(created, id)` and a ballot's sequence number
 * is its index in that order. Keypers refer to ballots by sequence number in a
 * signed artifact, so the order must be stable; it is, because keypers read only
 * after voting has closed.
 *
 * Every stored ballot is served. Votes with weight 0 (`0 < vp < 0.5`) are refused
 * by the sequencer at ingest (`isDustVotingPower`), so none are dropped here.
 *
 * Paging: the page is chosen by a keys-only query and only its envelopes (~120 KB
 * each) are read. A page holds at most `MAX_BALLOT_PAGE` rows and stops at
 * `MAX_BALLOT_PAGE_BYTES`.
 */
router.get('/proposal/:id/te_sgp_ballots', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId, res);
    if (!proposal) return;

    const start = Math.max(
      0,
      parseInt(String(req.query.start ?? '0'), 10) || 0
    );
    const rawCount = parseInt(String(req.query.count ?? '0'), 10);
    const countOnly = req.query.countOnly === '1';

    // Refuse a proposal whose frozen eligibility key has been rotated: every
    // credential on it would fail and the tally would be all zeros. Checked
    // before reading any rows.
    try {
      const snapshot = parseCommitteeSnapshot(proposal.te_sgp_config);
      const currentEligibilityKey = await eligibilityPublicKey();
      if (
        currentEligibilityKey.toLowerCase() !==
        snapshot.eligibilityKey.toLowerCase()
      ) {
        log.error(
          `[sgp] ${proposalId}: eligibility key rotated since this proposal was created`
        );
        return sendError(
          res,
          'frozen eligibility key does not match the hub key in use; ' +
            'the key was rotated and credentials on this proposal can no longer verify',
          503
        );
      }
    } catch (err: any) {
      if (err instanceof SgpConfigError) {
        log.error(`[sgp] ${proposalId}: ${err.message}`);
        return sendError(res, err.message, 500);
      }
      throw err;
    }

    // cb != -3 excludes soft-deleted votes (CB.PENDING_DELETE in the sequencer).
    // A plain COUNT, so `countOnly` reads no envelopes.
    const [{ total }] = await (db as any).queryAsync(
      'SELECT COUNT(*) AS total FROM votes WHERE proposal = ? AND cb != -3',
      [proposalId]
    );
    if (countOnly) return res.json({ count: Number(total) });

    const limit =
      rawCount > 0 ? Math.min(rawCount, MAX_BALLOT_PAGE) : MAX_BALLOT_PAGE;

    // Choose the page on keys only, so envelopes are not read for skipped rows.
    // `space` lets MySQL read the votes in order from the
    // (space, proposal, created, id) index instead of sorting them all per page.
    const keys = await (db as any).queryAsync(
      `SELECT id FROM votes
        WHERE space = ? AND proposal = ? AND cb != -3
        ORDER BY created ASC, id ASC
        LIMIT ? OFFSET ?`,
      [proposal.space, proposalId, limit, start]
    );
    if (!keys.length) return res.json({ ballots: [], total: Number(total) });

    // Cut the page at MAX_BALLOT_PAGE_BYTES (by JSON_STORAGE_SIZE) before reading
    // any envelope. It keeps a prefix of `keys`, so `start + i` stays correct.
    const sizes = await (db as any).queryAsync(
      `SELECT id, JSON_STORAGE_SIZE(choice) AS size
         FROM votes
        WHERE proposal = ? AND id IN (?)`,
      [proposalId, (keys as any[]).map(k => k.id)]
    );
    const sizeOf = new Map<string, number>(
      (sizes as any[]).map(r => [r.id, Number(r.size)])
    );
    let pageBytes = 0;
    let take = 0;
    for (const k of keys as any[]) {
      const size = sizeOf.get(k.id) ?? 0;
      if (take > 0 && pageBytes + size > MAX_BALLOT_PAGE_BYTES) break;
      pageBytes += size;
      take++;
    }
    const pageKeys = (keys as any[]).slice(0, take);

    // Put envelopes in `pageKeys` order in JS, not with ORDER BY: MySQL cannot
    // sort a row larger than `sort_buffer_size` (256 KiB by default), and one
    // envelope can be (e.g. five choices at budget 100).
    const fetched = await (db as any).queryAsync(
      `SELECT id, choice, created
         FROM votes
        WHERE proposal = ? AND id IN (?)`,
      [proposalId, pageKeys.map(k => k.id)]
    );
    const byId = new Map<string, any>((fetched as any[]).map(r => [r.id, r]));
    const rows = pageKeys.map(k => byId.get(k.id));
    if (rows.some(r => r === undefined)) {
      // A vote in the window was deleted between the two queries. Serving the
      // rest would renumber what follows it, so ask the reader to retry.
      return sendError(res, 'ballot list changed while reading; retry', 503);
    }

    const ballots: any[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Position in the total order, not in this page.
      const seq = start + i;
      const envelope = parseJsonField<any>(row.choice, null);
      // Fail instead of skipping: a skip would renumber every later ballot.
      // Ingest checks the envelope, so this means the row is corrupt.
      if (!envelope?.ciphertexts) {
        log.error(`[sgp] ${proposalId}: vote ${row.id} has no ballot envelope`);
        return sendError(
          res,
          `vote ${row.id} has no ballot envelope; the row is corrupt`,
          500
        );
      }

      const credential = envelope.attestation;
      const missing = [
        !credential?.signature && 'credential',
        !Number.isInteger(credential?.weight) && 'weight',
        !Number.isInteger(credential?.nonce) && 'nonce'
      ].filter(Boolean);
      if (missing.length) {
        log.error(
          `[sgp] ${proposalId}: vote ${row.id} is missing ${missing.join(', ')}`
        );
        return sendError(
          res,
          `vote ${row.id} has an incomplete eligibility credential (missing ` +
            `${missing.join(', ')}). Ingest refuses a ballot without all of them, ` +
            'so this row predates that check and cannot be served to the committee.',
          500
        );
      }
      // `sequenceNumber` and `submittedAt` go next to the ballot, not inside it:
      // the ballot is signed by the voter, so adding fields would break that.
      ballots.push({
        ballot: {
          electionId: proposalId,
          pseudonym: envelope.pseudonym,
          vk: envelope.vk,
          ciphertexts: envelope.ciphertexts,
          zkProof: envelope.zkProof,
          voterSignature: envelope.voterSignature,
          // Passed through as signed (`voterSignature` covers it), including
          // `scheme`.
          attestation: {
            scheme: credential.scheme ?? 'ATTESTATION_V1',
            electionId: credential.electionId,
            pseudonym: credential.pseudonym,
            vk: credential.vk,
            weight: credential.weight,
            nonce: credential.nonce,
            signature: credential.signature
          }
        },
        sequenceNumber: seq,
        submittedAt: Number(row.created)
      });
    }

    return res.json({ ballots, total: Number(total) });
  } catch (err: any) {
    log.error(`[sgp] te_sgp_ballots ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/**
 * A keyper's DKG result.
 *
 * The keyper index comes from the recovered signer, never from the request, so a
 * member cannot submit for another.
 *
 * The key is published once `thresholdT` members have submitted the same
 * `(pkElection, committeePKs)`. Submissions are kept after that too. Resending
 * the same values is a no-op; sending different ones is a 409, and the first
 * submission is kept.
 */
router.post('/proposal/:id/te_sgp_dkg', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId, res);
    if (!proposal) return;

    const snapshot = committeeFor(proposal, res);
    if (!snapshot) return;

    const { pkElection, committeePKs, keyperSig } = req.body || {};
    let pkCanon: string;
    let committeeCanon: string[];
    try {
      pkCanon = canonicalPoint(pkElection, 'pkElection', 96);
      if (!Array.isArray(committeePKs) || committeePKs.length === 0) {
        throw new SgpDigestError('committeePKs: expected a non-empty array');
      }
      committeeCanon = committeePKs.map((pk, i) =>
        canonicalPoint(pk, `committeePKs[${i}]`, 96)
      );
    } catch (err: any) {
      return sendError(res, err?.message || 'bad_request', 400);
    }
    if (typeof keyperSig !== 'string') {
      return sendError(res, 'keyperSig: expected a string', 400);
    }
    if (committeeCanon.length !== snapshot.thresholdN) {
      return sendError(
        res,
        `committeePKs: expected ${snapshot.thresholdN} keys, got ${committeeCanon.length}`,
        400
      );
    }

    let signer: string | null;
    try {
      signer = recoverDigestSigner(
        dkgResultDigest({
          electionId: proposalId,
          pkElection: pkCanon,
          committeePKs: committeeCanon
        }),
        keyperSig
      );
    } catch (err: any) {
      return sendError(res, err?.message || 'bad_request', 400);
    }

    const index = keyperIndexOf(snapshot, signer);
    if (index === -1) {
      log.warn(
        `[sgp] ${proposalId}: DKG submission from non-member ${signer ?? 'unrecoverable'}`
      );
      // The protocol client treats 403 as an authorisation error (401 would be
      // retried).
      return sendError(res, 'not_a_registered_keyper', 403);
    }
    const keyperIndex = index + 1; // committee indices are 1-based

    const committeeJson = JSON.stringify(committeeCanon);
    // INSERT IGNORE, then compare with the stored row: the first submission wins,
    // and two concurrent submissions from one keyper cannot both insert.
    await (db as any).queryAsync(
      `INSERT IGNORE INTO te_dkg_submissions
         (proposal_id, keyper_index, keyper_address, mpk_hex, committee_pks_hex, signature, posted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        proposalId,
        keyperIndex,
        signer,
        pkCanon,
        committeeJson,
        keyperSig,
        Math.floor(Date.now() / 1000)
      ]
    );
    const [stored] = await (db as any).queryAsync(
      'SELECT mpk_hex, committee_pks_hex FROM te_dkg_submissions WHERE proposal_id = ? AND keyper_index = ? LIMIT 1',
      [proposalId, keyperIndex]
    );
    if (
      stored.mpk_hex !== pkCanon ||
      stored.committee_pks_hex !== committeeJson
    ) {
      log.warn(
        `[sgp] ${proposalId}: keyper ${keyperIndex} changed its DKG submission`
      );
      return sendError(res, 'keyper_changed_submission', 409);
    }

    const [{ c: matching }] = await (db as any).queryAsync(
      'SELECT COUNT(*) AS c FROM te_dkg_submissions WHERE proposal_id = ? AND mpk_hex = ? AND committee_pks_hex = ?',
      [proposalId, pkCanon, committeeJson]
    );
    const required = snapshot.thresholdT;

    if (Number(matching) >= required) {
      // `te_mpk IS NULL` means only the first concurrent UPDATE takes effect.
      await (db as any).queryAsync(
        'UPDATE proposals SET te_mpk = UNHEX(?), te_committee_pks = ? WHERE id = ? AND te_mpk IS NULL',
        [pkCanon.slice(2), committeeJson, proposalId]
      );
      log.info(
        `[sgp] ${proposalId}: DKG finalised at ${matching}/${required} matching submissions`
      );
    } else {
      log.info(
        `[sgp] ${proposalId}: DKG submission ${matching}/${required} from keyper ${keyperIndex}`
      );
    }

    // 204: the protocol's port defines this write as returning nothing.
    return res.status(204).end();
  } catch (err: any) {
    log.error(`[sgp] te_sgp_dkg ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/**
 * The aggregate a quorum of the committee agreed on, or `null` while none has.
 *
 * Returns `'split'` if two different aggregates each reached quorum; callers
 * answer 409 instead of picking one.
 *
 * Read from the signed submissions. Returned as the stored JSON text so weights
 * above 2^53 stay exact.
 */
export async function canonicalAggregateFor(
  proposalId: string,
  snapshot: { thresholdT: number }
): Promise<string | null | 'split'> {
  const groups = await (db as any).queryAsync(
    `SELECT digest, COUNT(*) AS c, MIN(aggregate_json) AS aggregate_json
       FROM te_aggregate_submissions
      WHERE proposal_id = ?
      GROUP BY digest`,
    [proposalId]
  );
  const reached = groups.filter((g: any) => Number(g.c) >= snapshot.thresholdT);
  if (reached.length > 1) return 'split';
  if (reached.length === 0) return null;
  return String(reached[0].aggregate_json);
}

/**
 * One keyper's aggregate submission, inside the caller's transaction.
 *
 * Locks the proposal row first, so submissions for one proposal run one at a time.
 * Returns the HTTP outcome instead of sending it, so the caller can close the
 * transaction first.
 */
async function submitAggregate(
  connection: any,
  args: {
    proposalId: string;
    keyperIndex: number;
    signer: string;
    keyperSig: string;
    digestHex: string;
    aggregateJson: string;
    required: number;
  }
): Promise<{ status: number; error?: string }> {
  const { proposalId, keyperIndex, digestHex, required } = args;
  // Locks the proposal row so concurrent submissions are counted one at a time.
  await connection.queryAsync(
    'SELECT id FROM proposals WHERE id = ? FOR UPDATE',
    [proposalId]
  );
  const before = await connection.queryAsync(
    'SELECT COUNT(*) AS c FROM te_aggregate_submissions WHERE proposal_id = ? GROUP BY digest',
    [proposalId]
  );
  const frozen = before.some((g: any) => Number(g.c) >= required);

  const existing = await connection.queryAsync(
    'SELECT digest FROM te_aggregate_submissions WHERE proposal_id = ? AND keyper_index = ? LIMIT 1',
    [proposalId, keyperIndex]
  );
  if (existing[0]?.digest === digestHex) {
    return { status: 204 }; // idempotent resend of this keyper's own row
  }
  if (existing[0] && frozen) {
    log.warn(
      `[sgp] ${proposalId}: keyper ${keyperIndex} changed its aggregate after the quorum`
    );
    return {
      status: 409,
      error: 'aggregate already finalized (quorum reached)'
    };
  }

  await connection.queryAsync(
    `INSERT INTO te_aggregate_submissions
       (proposal_id, keyper_index, keyper_address, aggregate_json, digest, signature, posted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       aggregate_json = VALUES(aggregate_json),
       digest = VALUES(digest),
       signature = VALUES(signature),
       posted_at = VALUES(posted_at)`,
    [
      proposalId,
      keyperIndex,
      args.signer,
      args.aggregateJson,
      digestHex,
      args.keyperSig,
      Math.floor(Date.now() / 1000)
    ]
  );

  const groups = await connection.queryAsync(
    'SELECT digest, COUNT(*) AS c FROM te_aggregate_submissions WHERE proposal_id = ? GROUP BY digest',
    [proposalId]
  );
  const reached = groups.filter((g: any) => Number(g.c) >= required);

  if (reached.length > 1) {
    log.error(
      `[sgp] ${proposalId}: ${reached.length} distinct aggregates each reached the quorum of ${required}`
    );
    return { status: 409, error: 'aggregate: split quorum' };
  }

  if (reached.length === 1) {
    log.info(
      `[sgp] ${proposalId}: aggregate canonical at ${reached[0].c}/${required} matching submissions`
    );
  } else {
    const mine = groups.find((g: any) => g.digest === digestHex);
    log.info(
      `[sgp] ${proposalId}: aggregate submission ${mine?.c ?? 1}/${required} from keyper ${keyperIndex}`
    );
  }
  return { status: 204 };
}

/**
 * One keyper's aggregate. Once `thresholdT` keypers submit the same one, it is
 * stored as the proposal's aggregate. These rules match the protocol's reference
 * store:
 *
 *   - 422 before voting ends.
 *   - A keyper may replace its aggregate until quorum is reached (the coordinator
 *     asks keypers to recompute when they disagree); after that a change is a 409.
 *   - If two different aggregates both reach quorum, the answer is 409.
 */
router.post('/proposal/:id/te_aggregate', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId, res);
    if (!proposal) return;

    const snapshot = committeeFor(proposal, res);
    if (!snapshot) return;

    // The protocol client treats 422 as a voting-window error and retries later
    // (a 400 would never be retried).
    if (Math.floor(Date.now() / 1000) < Number(proposal.end)) {
      return sendError(res, 'aggregate submitted before voting_end', 422);
    }

    // Re-parse the raw body: the weight totals can exceed 2^53, and `req.body`
    // has already rounded them.
    let body: any = req.body;
    if (typeof (req as any).rawBody === 'string') {
      try {
        body = parseJsonPreservingBigInts((req as any).rawBody);
      } catch {
        return sendError(res, 'malformed json', 400);
      }
    }

    const { aggregate, keyperSig } = body || {};
    let canonical;
    try {
      canonical = canonicalAggregate(aggregate, proposalId);
    } catch (err: any) {
      return sendError(res, err?.message || 'bad_request', 400);
    }
    if (typeof keyperSig !== 'string') {
      return sendError(res, 'keyperSig: expected a string', 400);
    }

    let digest: Buffer;
    try {
      digest = aggregateDigest({
        electionId: proposalId,
        aggregates: canonical.aggregates,
        admitted: canonical.admitted,
        exclusions: canonical.exclusions,
        totalAdmittedWeight: canonical.totalAdmittedWeight,
        totalScaledWeight: canonical.totalScaledWeight
      });
    } catch (err: any) {
      return sendError(res, err?.message || 'bad_request', 400);
    }

    const signer = recoverDigestSigner(digest, keyperSig);
    const index = keyperIndexOf(snapshot, signer);
    if (index === -1) {
      log.warn(
        `[sgp] ${proposalId}: aggregate from non-member ${signer ?? 'unrecoverable'}`
      );
      return sendError(res, 'not_a_registered_keyper', 403);
    }
    const keyperIndex = index + 1; // committee indices are 1-based
    const digestHex = `0x${digest.toString('hex')}`;

    // The freeze check, write, quorum count and promotion run in one
    // transaction. Otherwise a keyper replacing its row between another keyper's
    // count and promotion could leave a promoted aggregate without a quorum.
    const connection = await (db as any).getConnectionAsync();
    let outcome: { status: number; error?: string };
    try {
      await connection.beginTransactionAsync();
      outcome = await submitAggregate(connection, {
        proposalId,
        keyperIndex,
        signer: signer!,
        keyperSig,
        digestHex,
        aggregateJson: stringifyPreservingBigInts(canonical),
        required: snapshot.thresholdT
      });
      await connection.commitAsync();
    } catch (err) {
      await connection.rollbackAsync().catch(() => undefined);
      throw err;
    } finally {
      connection.release();
    }
    if (outcome.error) return sendError(res, outcome.error, outcome.status);
    return res.status(outcome.status).end();
  } catch (err: any) {
    log.error(`[sgp] te_aggregate ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/**
 * The canonical aggregate, or null while the committee has not agreed on one.
 *
 * Read from the signed submissions, so only an aggregate the keypers signed is
 * ever served.
 */
router.get('/proposal/:id/te_sgp_aggregate', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId, res);
    if (!proposal) return;

    const snapshot = committeeFor(proposal, res);
    if (!snapshot) return;

    const canonical = await canonicalAggregateFor(proposalId, snapshot);

    if (canonical === 'split') {
      log.error(
        `[sgp] ${proposalId}: distinct aggregates each reached the quorum`
      );
      return sendError(res, 'aggregate: split quorum', 409);
    }

    return res
      .type('application/json')
      .send(`{"aggregate":${canonical ?? 'null'}}`);
  } catch (err: any) {
    log.error(`[sgp] te_sgp_aggregate ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

const DECRYPT_TRANSCRIPT_LABEL = 'SHUTTER-VOTE-DECRYPT-v1';

let curvesReady: Promise<void> | null = null;
function ensureCurves(): Promise<void> {
  if (!curvesReady) curvesReady = initCurves();
  return curvesReady;
}

/**
 * Checks a keyper's DLEQ proofs against the canonical aggregate before its shares
 * are stored. Shares cannot be replaced once stored, so a bad one is rejected here
 * (400) instead. Returns the index of the first failing candidate, or null if
 * all proofs verify.
 */
async function verifyShareProofs(
  proposalId: string,
  keyperIndex: number,
  entries: Array<{ sigma: string; proof: string }>,
  aggregates: Array<{ c1: string; c2: string }>,
  pkHex: string
): Promise<number | null> {
  await ensureCurves();
  const hex = (v: string) => Buffer.from(String(v).replace(/^0x/, ''), 'hex');

  for (let candidate = 0; candidate < entries.length; candidate++) {
    let c1: G2Point | null = null;
    let c2: G2Point | null = null;
    let sigma: G2Point | null = null;
    let pk: G2Point | null = null;
    try {
      c1 = G2Point.fromBytes(hex(aggregates[candidate].c1));
      c2 = G2Point.fromBytes(hex(aggregates[candidate].c2));
      sigma = G2Point.fromBytes(hex(entries[candidate].sigma));
      pk = G2Point.fromBytes(hex(pkHex));

      const proof = hex(entries[candidate].proof);
      const transcript = new Transcript(DECRYPT_TRANSCRIPT_LABEL);
      transcript.append('electionId', hex(proposalId));
      const candidateBuf = Buffer.alloc(2);
      candidateBuf.writeUInt16BE(candidate, 0);
      transcript.append('candidate', candidateBuf);

      const ok = verifyDecryptionShare(
        { c1, c2 },
        {
          keyperIndex,
          sigma,
          proof: {
            e: BigInt(`0x${proof.subarray(0, 32).toString('hex')}`),
            z: BigInt(`0x${proof.subarray(32).toString('hex')}`)
          }
        },
        pk,
        transcript
      );
      if (!ok) return candidate;
    } catch {
      return candidate;
    } finally {
      c1?.destroyWasm();
      c2?.destroyWasm();
      sigma?.destroyWasm();
      pk?.destroyWasm();
    }
  }
  return null;
}

/**
 * One keyper's decryption shares — its partial decryption of every candidate.
 *
 * Shares decrypt the canonical aggregate, so they are refused with 422 (retry
 * later) before voting ends or before a canonical aggregate exists.
 *
 * Shares are permanent: resending the same ones is a no-op, and different ones
 * from the same keyper are a 409.
 *
 * The request holds one keyper's shares for all candidates and is signed as a
 * whole; it is stored as one row per (keyper, candidate), which the audit routes
 * read.
 */
router.post('/proposal/:id/te_sgp_decryption_share', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId, res);
    if (!proposal) return;

    const snapshot = committeeFor(proposal, res);
    if (!snapshot) return;

    if (Math.floor(Date.now() / 1000) < Number(proposal.end)) {
      return sendError(
        res,
        'decryption share submitted before voting_end',
        422
      );
    }

    const canonicalJson = await canonicalAggregateFor(proposalId, snapshot);
    if (canonicalJson === 'split') {
      return sendError(res, 'aggregate: split quorum', 409);
    }
    if (!canonicalJson) {
      return sendError(
        res,
        'decryption share submitted before a canonical aggregate exists',
        422
      );
    }
    const canonical = parseJsonPreservingBigInts(canonicalJson);

    const { share, keyperSig } = req.body || {};
    if (typeof keyperSig !== 'string') {
      return sendError(res, 'keyperSig: expected a string', 400);
    }
    const entries = Array.isArray(share?.entries) ? share.entries : null;
    if (!entries || entries.length === 0) {
      return sendError(res, 'share.entries: expected a non-empty array', 400);
    }
    if (entries.length !== canonical.aggregates.length) {
      // One entry per candidate; a short list would break recovery.
      return sendError(
        res,
        `share.entries: expected ${canonical.aggregates.length} entries, got ${entries.length}`,
        400
      );
    }

    let digest: Buffer;
    try {
      digest = decryptionShareDigest({ electionId: proposalId, entries });
    } catch (err: any) {
      return sendError(res, err?.message || 'bad_request', 400);
    }

    const signer = recoverDigestSigner(digest, keyperSig);
    const index = keyperIndexOf(snapshot, signer);
    if (index === -1) {
      log.warn(
        `[sgp] ${proposalId}: decryption share from non-member ${signer ?? 'unrecoverable'}`
      );
      return sendError(res, 'not_a_registered_keyper', 403);
    }
    const keyperIndex = index + 1;

    // The signer decides the index; a different claimed index is refused.
    if (
      share.keyperIndex !== undefined &&
      Number(share.keyperIndex) !== keyperIndex
    ) {
      return sendError(
        res,
        `share keyperIndex ${share.keyperIndex} does not match signer ${keyperIndex}`,
        403
      );
    }

    const existing = await (db as any).queryAsync(
      'SELECT candidate, HEX(sigma) AS sigma_hex, HEX(proof_e) AS e_hex, HEX(proof_z) AS z_hex FROM te_decryption_shares WHERE proposal_id = ? AND keyper_index = ? ORDER BY candidate',
      [proposalId, keyperIndex]
    );
    if (existing.length > 0) {
      const same =
        existing.length === entries.length &&
        existing.every((row: any, i: number) => {
          const proof = String(entries[i].proof || '')
            .replace(/^0x/, '')
            .toLowerCase();
          return (
            row.sigma_hex.toLowerCase() ===
              String(entries[i].sigma || '')
                .replace(/^0x/, '')
                .toLowerCase() &&
            `${row.e_hex}${row.z_hex}`.toLowerCase() === proof
          );
        });
      if (same) return res.status(204).end(); // idempotent resend
      log.warn(
        `[sgp] ${proposalId}: keyper ${keyperIndex} already submitted different shares`
      );
      return sendError(res, 'keyper already submitted different shares', 409);
    }

    const committeePKs = parseJsonField<string[]>(
      proposal.te_committee_pks,
      []
    );
    const pkHex = committeePKs[keyperIndex - 1];
    if (!pkHex) {
      log.error(
        `[sgp] ${proposalId}: keyper ${keyperIndex} has no key in the published committee`
      );
      return sendError(res, 'keyper has no published key', 400);
    }
    const badCandidate = await verifyShareProofs(
      proposalId,
      keyperIndex,
      entries,
      canonical.aggregates,
      pkHex
    );
    if (badCandidate !== null) {
      log.error(
        `[sgp] ${proposalId}: keyper ${keyperIndex} DLEQ invalid for candidate ${badCandidate}`
      );
      return sendError(res, 'invalid_dleq_proof', 400);
    }

    // One INSERT for all candidates, so the shares are stored all or nothing and
    // a retry is not mistaken for different shares.
    const now = Math.floor(Date.now() / 1000);
    const hex = (v: unknown) =>
      Buffer.from(String(v).replace(/^0x/, ''), 'hex');
    const rows = entries.map((entry: any, candidate: number) => {
      const proof = hex(entry.proof);
      return [
        proposalId,
        keyperIndex,
        candidate,
        hex(entry.sigma),
        proof.subarray(0, 32),
        proof.subarray(32),
        now
      ];
    });
    await (db as any).queryAsync(
      `INSERT IGNORE INTO te_decryption_shares
         (proposal_id, keyper_index, candidate, sigma, proof_e, proof_z, posted_at)
       VALUES ?`,
      [rows]
    );

    log.info(
      `[sgp] ${proposalId}: decryption shares from keyper ${keyperIndex} (${entries.length} candidates)`
    );
    return res.status(204).end();
  } catch (err: any) {
    log.error(
      `[sgp] te_sgp_decryption_share ${proposalId}: ${err?.message || err}`
    );
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/**
 * Every keyper's shares, grouped per keyper. A keyper missing any candidate is
 * left out, since a partial set would break recovery.
 */
router.get('/proposal/:id/te_sgp_decryption_shares', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId, res);
    if (!proposal) return;

    const choices = parseJsonField<string[]>(proposal.choices, []);
    const rows = await (db as any).queryAsync(
      'SELECT keyper_index, candidate, HEX(sigma) AS sigma_hex, HEX(proof_e) AS e_hex, HEX(proof_z) AS z_hex FROM te_decryption_shares WHERE proposal_id = ? ORDER BY keyper_index, candidate',
      [proposalId]
    );

    const byKeyper = new Map<number, any[]>();
    for (const row of rows) {
      const list = byKeyper.get(row.keyper_index) ?? [];
      list[row.candidate] = {
        sigma: `0x${row.sigma_hex.toLowerCase()}`,
        proof: `0x${row.e_hex.toLowerCase()}${row.z_hex.toLowerCase()}`
      };
      byKeyper.set(row.keyper_index, list);
    }

    const shares = [...byKeyper.entries()]
      .filter(
        ([, entries]) =>
          entries.length === choices.length && entries.every(Boolean)
      )
      .sort((a, b) => a[0] - b[0])
      .map(([keyperIndex, entries]) => ({
        electionId: proposalId,
        keyperIndex,
        entries
      }));

    return res.json({ shares });
  } catch (err: any) {
    log.error(
      `[sgp] te_sgp_decryption_shares ${proposalId}: ${err?.message || err}`
    );
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/**
 * The published tally, signed by the result publisher.
 *
 * Must be signed by the config's `resultPublisherKey` (the coordinator), over these
 * exact totals. The hub does not recompute the result.
 *
 * Write-once: an identical resend is a no-op (204), a different result is a 409.
 */
router.post('/proposal/:id/te_result', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId, res);
    if (!proposal) return;

    const snapshot = committeeFor(proposal, res);
    if (!snapshot) return;

    // Re-parse the raw body: totals can exceed 2^53, and `req.body` has already
    // rounded them.
    let body: any = req.body;
    if (typeof (req as any).rawBody === 'string') {
      try {
        body = parseJsonPreservingBigInts((req as any).rawBody);
      } catch {
        return sendError(res, 'malformed json', 400);
      }
    }

    const result = body?.result;
    const sig = body?.resultPublisherSig;
    if (typeof sig !== 'string') {
      return sendError(res, 'resultPublisherSig: expected a string', 400);
    }

    // The publisher signs the `result` operation with `resultDigest` as payload,
    // not `resultDigest` on its own.
    let digest: Buffer;
    try {
      digest = requestDigest(
        'result',
        proposalId,
        resultDigest({
          electionId: proposalId,
          totals: result?.totals,
          keyperIndices: result?.keyperIndices,
          bsgsBound: result?.bsgsBound
        })
      );
    } catch (err: any) {
      return sendError(res, err?.message || 'bad_request', 400);
    }

    const signer = recoverDigestSigner(digest, sig);
    if (
      !signer ||
      signer.toLowerCase() !== snapshot.resultPublisherAddress.toLowerCase()
    ) {
      log.warn(
        `[sgp] ${proposalId}: result from ${signer ?? 'unrecoverable'}, not the result publisher`
      );
      return sendError(res, 'not_the_result_publisher', 403);
    }

    // Store decimal digits (e.g. "0x05" becomes "5"): GET writes totals into the
    // JSON as bare numbers, so hex would make it invalid.
    const totalsJson = JSON.stringify(
      result.totals.map((t: any) => BigInt(t).toString())
    );
    const indicesJson = JSON.stringify(
      result.keyperIndices.map((k: any) => Number(BigInt(k)))
    );
    const bsgsBound = BigInt(result.bsgsBound).toString();

    const existing = await (db as any).queryAsync(
      'SELECT totals_json, keyper_indices, bsgs_bound FROM te_results WHERE proposal_id = ? LIMIT 1',
      [proposalId]
    );
    if (existing[0]) {
      const same =
        existing[0].totals_json === totalsJson &&
        existing[0].keyper_indices === indicesJson &&
        existing[0].bsgs_bound === bsgsBound;
      if (same) return res.status(204).end();
      log.warn(`[sgp] ${proposalId}: a different result was already published`);
      return sendError(res, 'result already published', 409);
    }

    await (db as any).queryAsync(
      `INSERT INTO te_results
         (proposal_id, totals_json, keyper_indices, bsgs_bound, signature, posted_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        proposalId,
        totalsJson,
        indicesJson,
        bsgsBound,
        sig,
        Math.floor(Date.now() / 1000)
      ]
    );
    log.info(`[sgp] ${proposalId}: result published, totals ${totalsJson}`);
    return res.status(204).end();
  } catch (err: any) {
    log.error(`[sgp] te_result ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/**
 * The published tally, or null.
 *
 * The protocol's codec expects totals as JSON numbers. They are written into the
 * response text from the stored decimal strings, so values above 2^53 stay exact.
 */
router.get('/proposal/:id/te_result', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId, res);
    if (!proposal) return;

    const rows = await (db as any).queryAsync(
      'SELECT totals_json, keyper_indices, bsgs_bound FROM te_results WHERE proposal_id = ? LIMIT 1',
      [proposalId]
    );
    if (!rows[0]) return res.json({ result: null });

    const totals: string[] = JSON.parse(rows[0].totals_json);
    const indices: number[] = JSON.parse(rows[0].keyper_indices);
    const payload =
      `{"result":{"electionId":"${proposalId}",` +
      `"totals":[${totals.join(',')}],` +
      `"keyperIndices":[${indices.join(',')}],` +
      `"bsgsBound":${rows[0].bsgs_bound}}}`;
    res.type('application/json').send(payload);
  } catch (err: any) {
    log.error(`[sgp] te_result ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/**
 * Who may clear a stalled tally: the space's current admins, or the proposal's
 * author if the space has none. Moderators may not.
 */
async function resumeAuthorities(proposal: any): Promise<string[]> {
  const rows = await (db as any).queryAsync(
    'SELECT settings FROM spaces WHERE id = ? LIMIT 1',
    [proposal.space]
  );
  const admins = parseJsonField<any>(rows[0]?.settings, {})?.admins;
  const list = Array.isArray(admins)
    ? admins.filter((a: any) => typeof a === 'string' && a)
    : [];
  return list.length ? list : [proposal.author].filter(Boolean);
}

/**
 * Marks a tally stalled or clears it.
 *
 *   - `stalled: true` must be signed by the `resultPublisherKey` (the coordinator).
 *   - `stalled: false` must be signed by a space admin (see `resumeAuthorities`).
 *
 * The coordinator cannot resume, so a stalled election waits for a person instead
 * of retrying forever after each coordinator restart.
 *
 * Both sign `requestDigest` with op `tally_stall` or `tally_resume` and the
 * `issuedAt` nonce as payload, so a stall signature cannot be used as a resume.
 */
router.post('/proposal/:id/te_tally_stalled', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId, res);
    if (!proposal) return;

    const snapshot = committeeFor(proposal, res);
    if (!snapshot) return;

    const stalled = req.body?.stalled;
    const sig = req.body?.resultPublisherSig ?? req.body?.adminSig;
    if (typeof stalled !== 'boolean') {
      return sendError(res, 'stalled: expected a boolean', 400);
    }
    // Optional and unsigned. Truncated to 200 chars instead of rejected, so a bad
    // reason never stops a stall from being recorded.
    const rawReason = req.body?.reason;
    const reason =
      stalled && typeof rawReason === 'string' && rawReason.trim()
        ? rawReason.trim().slice(0, 200)
        : null;
    if (typeof sig !== 'string') {
      return sendError(res, 'signature: expected a string', 400);
    }

    const op = stalled ? 'tally_stall' : 'tally_resume';
    const expected = stalled
      ? [snapshot.resultPublisherAddress]
      : await resumeAuthorities(proposal);

    // The signed `issuedAt` must be recent and unused, so an observed stall
    // cannot be replayed after each admin resume.
    const issuedAt = req.body?.issuedAt;
    if (!Number.isInteger(issuedAt) || issuedAt < 0) {
      return sendError(res, 'issuedAt: expected a unix timestamp', 400);
    }
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - issuedAt) > REQUEST_FRESHNESS_S) {
      log.warn(
        `[sgp] ${proposalId}: ${op} issuedAt ${issuedAt} is outside the ±${REQUEST_FRESHNESS_S}s window (now ${now})`
      );
      return sendError(res, 'issuedAt is not within the accepted window', 400);
    }

    let signer: string | null;
    try {
      signer = recoverDigestSigner(
        requestDigest(op, proposalId, requestNoncePayload(issuedAt)),
        sig
      );
    } catch (err: any) {
      return sendError(res, err?.message || 'bad_request', 400);
    }
    const permitted =
      !!signer && expected.some(a => a.toLowerCase() === signer!.toLowerCase());
    if (!permitted) {
      log.warn(
        `[sgp] ${proposalId}: ${op} from ${signer ?? 'unrecoverable'}, expected one of ${expected.join(', ')}`
      );
      return sendError(
        res,
        stalled ? 'not_the_result_publisher' : 'not_the_admin',
        403
      );
    }
    // As in the protocol's own store: a tally can only stall after voting ends
    // and before its result is published. A late stall would otherwise stop the
    // published result from reaching the scores until an admin resumes.
    if (stalled) {
      if (now < proposal.end) {
        return sendError(res, 'voting has not ended', 422);
      }
      const [published] = await (db as any).queryAsync(
        'SELECT 1 FROM te_results WHERE proposal_id = ? LIMIT 1',
        [proposalId]
      );
      if (published) return sendError(res, 'result already published', 409);
    }

    try {
      await (db as any).queryAsync(
        `INSERT INTO te_request_nonces (proposal_id, op, issued_at, accepted_at)
         VALUES (?, ?, ?, ?)`,
        [proposalId, op, issuedAt, now]
      );
    } catch (err: any) {
      if (err?.code === 'ER_DUP_ENTRY') {
        const already = Boolean(proposal.te_tally_stalled) === stalled;
        log.warn(
          `[sgp] ${proposalId}: ${op} reused nonce ${issuedAt}${
            already ? ' (no-op, already in that state)' : ' — REJECTED'
          }`
        );
        if (already) return res.status(204).end();
        return sendError(res, 'this request has already been used', 409);
      }
      throw err;
    }
    // Nonces older than the window can never be accepted again.
    await (db as any).queryAsync(
      'DELETE FROM te_request_nonces WHERE issued_at < ?',
      [now - REQUEST_FRESHNESS_S]
    );

    await (db as any).queryAsync(
      'UPDATE proposals SET te_tally_stalled = ?, te_tally_stall_reason = ? WHERE id = ? LIMIT 1',
      // Resume also clears the reason.
      [stalled ? 1 : 0, reason, proposalId]
    );
    log.info(
      `[sgp] ${proposalId}: tally ${stalled ? 'marked stalled' : 'resumed by admin'}`
    );
    return res.status(204).end();
  } catch (err: any) {
    log.error(`[sgp] te_tally_stalled ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/** Every DKG submission recorded so far, for the auditor and the coordinator. */
router.get('/proposal/:id/te_sgp_dkg', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId, res);
    if (!proposal) return;
    const rows = await (db as any).queryAsync(
      `SELECT keyper_index, mpk_hex, committee_pks_hex, signature
         FROM te_dkg_submissions WHERE proposal_id = ? ORDER BY keyper_index`,
      [proposalId]
    );
    return res.json({
      submissions: (rows as any[]).map(r => ({
        electionId: proposalId,
        pkElection: r.mpk_hex,
        committeePKs: parseJsonField<string[]>(r.committee_pks_hex, []),
        keyperSignature: r.signature
      }))
    });
  } catch (err: any) {
    log.error(`[sgp] te_sgp_dkg read ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

export default router;
