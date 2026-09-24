/**
 * Read endpoints serving Snapshot state in the threshold protocol's own shapes.
 *
 * The keypers and their coordinator run from a separate codebase and speak one
 * fixed data-layer contract. A translator service maps that contract onto these
 * endpoints; this router is where Snapshot's schema is turned into the protocol's
 * artifacts. Everything here is a read — the protocol treats the data layer as
 * trusted for availability only, so all of it is public and unauthenticated.
 *
 * Kept separate from `te.ts` on purpose: that router serves the browser's audit
 * panel and the legacy write paths, and its shapes are load-bearing for the UI.
 * Mixing the two would make it unclear which shape may change.
 */

import {
  G2Point,
  initCurves,
  Transcript,
  verifyDecryptionShare
} from '@shutter-network/urban-verified-crypto';
import { capture } from '@snapshot-labs/snapshot-sentry';
import express from 'express';
import { parseJsonPreservingBigInts } from './helpers/bigIntJson';
import {
  EligibilityKeyError,
  eligibilityPublicKey
} from './helpers/eligibilityKey';
import { canonicalAggregate, canonicalPoint } from './helpers/gegAggregate';
import {
  composeElectionConfig,
  GegConfigError,
  parseCommitteeSnapshot
} from './helpers/gegConfig';
import {
  aggregateDigest,
  aggregateDigestPreScale,
  decryptionShareDigest,
  dkgResultDigest,
  GegDigestError,
  recoverDigestSigner,
  requestDigest,
  requestNoncePayload,
  resultDigest
} from './helpers/gegDigests';
import log from './helpers/log';
import db from './helpers/mysql';
import { sendError } from './helpers/utils';

const router = express.Router();

/**
 * Largest ballot page this route will serve.
 *
 * Matches the protocol's own `BALLOT_PAGE` and the reference data layer's
 * `MAX_BALLOT_PAGE`, so a conforming keyper never sees a short page. A client
 * asking for more gets one anyway: `read_all_ballots` advances by the number of
 * rows it received, so truncation costs an extra request and nothing else.
 */
const MAX_BALLOT_PAGE = 1000;

/**
 * How far a stall/resume request's `issuedAt` may sit from the hub's clock.
 *
 * Wide enough that ordinary clock skew between the coordinator, a voter's browser
 * and the hub never rejects an honest request; narrow enough that a captured
 * signature stops being useful long before the next admin retry, which is the
 * replay this bounds.
 */
const REQUEST_FRESHNESS_S = 300;

/** How many proposals one `list` response may name. */
const LIST_LIMIT = 500;

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

async function loadProposal(proposalId: string): Promise<any | null> {
  const rows = await (db as any).queryAsync(
    `SELECT id, privacy, type, choices, start, end, author, space, te_mpk,
            te_committee_pks, te_geg_config, te_config, te_aggregate,
            te_dkg_status, te_tally_stalled, te_tally_stall_reason
       FROM proposals WHERE id = ? LIMIT 1`,
    [proposalId]
  );
  return rows[0] || null;
}

/**
 * Proposals the coordinator could still act on.
 *
 * Deliberately not the full history. The coordinator polls this on an interval
 * and then reads each entry, so returning every private proposal ever created
 * would make each tick cost O(history). It only ever acts on proposals awaiting
 * key generation or awaiting a tally, which is exactly what this filter keeps.
 *
 * The trade-off is that an auditor cannot enumerate history through here and must
 * be given proposal ids. The per-proposal reads remain complete and public.
 */
router.get('/te_geg_elections', async (req, res) => {
  try {
    const rows = await (db as any).queryAsync(
      `SELECT id FROM proposals
        WHERE privacy = 'shutter-elgamal'
          AND te_geg_config IS NOT NULL
          AND (te_dkg_status IS NULL OR te_dkg_status = '')
          AND (scores_state IS NULL OR scores_state != 'final')
        ORDER BY start ASC
        LIMIT ?`,
      [LIST_LIMIT]
    );
    return res.json({ electionIds: (rows as any[]).map(r => r.id) });
  } catch (err: any) {
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/**
 * One election: its config plus the facts the protocol derives state from.
 *
 * `cancelled` is always false — Snapshot has no proposal cancellation, and
 * deletion removes the row entirely, which surfaces as a 404 instead.
 */
router.get('/proposal/:id/te_geg_election', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 404);
    }

    let config;
    try {
      config = composeElectionConfig({
        proposalId,
        choices: parseJsonField<string[]>(proposal.choices, []),
        type: proposal.type,
        snapshot: parseCommitteeSnapshot(proposal.te_geg_config),
        currentEligibilityKey: await eligibilityPublicKey()
      });
    } catch (err: any) {
      if (err instanceof GegConfigError || err instanceof EligibilityKeyError) {
        log.error(`[geg] ${proposalId}: ${err.message}`);
        return sendError(res, err.message, 503);
      }
      throw err;
    }

    const ingestConfig = parseJsonField<any>(proposal.te_config, null);
    const ingestBudget = Number(ingestConfig?.budget);
    if (ingestBudget !== config.budget) {
      log.error(
        `[geg] ${proposalId}: ballot budget disagrees — te_config says ${ingestConfig?.budget}, ` +
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
    // A finalized key exists only once the committee reached its quorum, which is
    // the same moment te_mpk was written.
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
      // Drives the coordinator's state machine: a stalled election is one it
      // has given up driving, and it will not resume until this clears.
      tallyStalled: Boolean(proposal.te_tally_stalled),
      // The coordinator's own account, passed through unverified and labelled as
      // such by the UI. Advisory: the flag above is signed, this is not, and the
      // keyper-vs-coordinator split an operator actually acts on is derived
      // client-side from share counts (see teVerify's `diagnoseTally`).
      tallyStallReason: proposal.te_tally_stall_reason ?? null,
      finalizedKey
    });
  } catch (err: any) {
    log.error(`[geg] te_geg_election ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/**
 * Every stored ballot as a protocol ballot envelope, each carrying a freshly
 * minted eligibility credential.
 *
 * **Ordering.** The protocol requires a stable total order with monotonic
 * sequence numbers, because a ballot's admission is expressed *as* its sequence
 * number inside an artifact every keyper must produce byte-identically. Snapshot's
 * votes table has no monotonic column and a re-vote updates its row in place, so
 * the order is `(created, id)` and the sequence number is the row's index in it.
 * That is deterministic, and stable by the time it matters: keypers only read
 * ballots after voting has closed, when no row can change again.
 *
 * **Dust** no longer reaches here. A voter with `0 < vp < 0.5` rounds to weight 0,
 * which the protocol rejects outright; the sequencer refuses such a vote at ingest
 * (see `isDustVotingPower`) rather than storing a ballot this route would have to
 * drop. Nothing is silently omitted, so every stored ballot is emitted and every
 * sequence number is accounted for.
 *
 * **Paging is done in SQL, and capped.** A private envelope is around 120 KB — the
 * budget-100 OR-proof dominates — so reading a whole election to serve one page
 * meant hundreds of megabytes crossing the connection for a request that returns a
 * fraction of it, and `countOnly` paid the same cost to return a single integer.
 * The window is now chosen by a keys-only query and only those rows have their
 * envelopes read, which keeps the cost proportional to what is served rather than
 * to the size of the election. `MAX_BALLOT_PAGE` matches the protocol's own
 * `BALLOT_PAGE`, and a client asking for more gets a short page, which its read
 * loop already handles by advancing on the length it received.
 */
router.get('/proposal/:id/te_geg_ballots', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 404);
    }

    const start = Math.max(
      0,
      parseInt(String(req.query.start ?? '0'), 10) || 0
    );
    const rawCount = parseInt(String(req.query.count ?? '0'), 10);
    const countOnly = req.query.countOnly === '1';

    // The weight is no longer computed here — the sequencer clamped and signed
    // it at ingest. What this block still does is refuse to serve a proposal
    // whose frozen eligibility key has been superseded, because every credential
    // on it would fail verification and the tally would read as all zeros.
    //
    // It runs before any read: there is no point paying for rows this request is
    // about to refuse to serve.
    try {
      const snapshot = parseCommitteeSnapshot(proposal.te_geg_config);
      // Refuse to serve credentials minted under a superseded key.
      const currentEligibilityKey = await eligibilityPublicKey();
      if (
        currentEligibilityKey.toLowerCase() !==
        snapshot.eligibilityKey.toLowerCase()
      ) {
        log.error(
          `[geg] ${proposalId}: eligibility key rotated since this proposal was created`
        );
        return sendError(
          res,
          'frozen eligibility key does not match the hub key in use; ' +
            'the key was rotated and credentials on this proposal can no longer verify',
          503
        );
      }
    } catch (err: any) {
      if (err instanceof GegConfigError) {
        log.error(`[geg] ${proposalId}: ${err.message}`);
        return sendError(res, err.message, 500);
      }
      throw err;
    }

    // cb != -3 excludes soft-deleted votes (CB.PENDING_DELETE in the sequencer).
    // Counting is a count: it must not read an envelope. The committee asks for
    // this before every tally, so reading the election to return one integer was
    // the most wasteful call the route served.
    const [{ total }] = await (db as any).queryAsync(
      'SELECT COUNT(*) AS total FROM votes WHERE proposal = ? AND cb != -3',
      [proposalId]
    );
    if (countOnly) return res.json({ count: Number(total) });

    const limit =
      rawCount > 0 ? Math.min(rawCount, MAX_BALLOT_PAGE) : MAX_BALLOT_PAGE;

    // Two queries rather than one, deliberately. Ordering by `(created, id)`
    // cannot use an index here — the only index leading with `proposal` orders by
    // `vp` — so MySQL sorts, and whether it drags 120 KB envelopes through that
    // sort is left to the optimiser. Choosing the window on keys alone removes
    // the question: the sort touches small rows, and only the page's envelopes
    // are ever read.
    const keys = await (db as any).queryAsync(
      `SELECT id FROM votes
        WHERE proposal = ? AND cb != -3
        ORDER BY created ASC, id ASC
        LIMIT ? OFFSET ?`,
      [proposalId, limit, start]
    );
    if (!keys.length) return res.json({ ballots: [], total: Number(total) });

    // Ordering must match the sequence-number derivation above exactly, in both
    // queries — the sequence number is a position in this order, and the
    // committee expresses admission and exclusion in those numbers.
    const rows = await (db as any).queryAsync(
      `SELECT id, choice, created
         FROM votes
        WHERE proposal = ? AND id IN (?)
        ORDER BY created ASC, id ASC`,
      [proposalId, (keys as any[]).map(k => k.id)]
    );

    const ballots: any[] = [];
    for (let i = 0; i < (rows as any[]).length; i++) {
      const row = (rows as any[])[i];
      // Position in the total order, not in this page.
      const seq = start + i;
      const envelope = parseJsonField<any>(row.choice, null);
      // A hard failure, not a skip. Skipping renumbers every ballot after it,
      // so the committee's admitted set would point at the wrong ballots — and
      // a silently dropped vote is the failure the ingest checks exist to
      // prevent. Ingest verifies the envelope before storing it, so this cannot
      // fire without something having corrupted the row.
      if (!envelope?.ciphertexts) {
        log.error(`[geg] ${proposalId}: vote ${row.id} has no ballot envelope`);
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
          `[geg] ${proposalId}: vote ${row.id} is missing ${missing.join(', ')}`
        );
        return sendError(
          res,
          `vote ${row.id} has an incomplete eligibility credential (missing ` +
            `${missing.join(', ')}). Ingest refuses a ballot without all of them, ` +
            'so this row predates that check and cannot be served to the committee.',
          500
        );
      }
      // Storage metadata rides *alongside* the envelope, never inside it: the
      // envelope is the voter-signed artifact, so adding a field to it would
      // break the signature it carries. The committee reads `sequenceNumber`
      // from out here — it is the identifier the admitted set and the exclusion
      // list are expressed in, so a ballot emitted without one is a ballot the
      // aggregate cannot refer to.
      ballots.push({
        ballot: {
          electionId: proposalId,
          pseudonym: envelope.pseudonym,
          vk: envelope.vk,
          ciphertexts: envelope.ciphertexts,
          zkProof: envelope.zkProof,
          voterSignature: envelope.voterSignature,
          // Emitted as the voter signed it — literally, since `voterSignature`
          // above covers these bytes. `scheme` is carried through rather than
          // asserted here, so the committee sees what the voter committed to.
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
    log.error(`[geg] te_geg_ballots ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/**
 * Normalise a compressed point to lowercase `0x` hex.
 *
 * The quorum rule counts *byte-identical* submissions, so the stored form has to
 * be canonical. Two keypers that agree on the key but disagree on capitalisation
 * would otherwise never reach quorum, and the failure would look like disagreement
 * rather than formatting.
 */

/**
 * A keyper's DKG result.
 *
 * The keyper index is **recovered from the signature**, never taken from the
 * request. A claimed index would let any member submit on behalf of another and
 * occupy its slot in the quorum; recovering it means a submission can only ever
 * count for whoever actually signed it.
 *
 * The key is published once `t + 1` distinct members have submitted a
 * byte-identical `(pkElection, committeePKs)` pair. Honest keypers derive the same
 * pair from the same ceremony, so a divergent one simply never reaches quorum
 * rather than needing to be adjudicated.
 *
 * Submissions are recorded even after finalisation. Re-submitting the same values
 * is idempotent; submitting different ones is a conflict, because a keyper that
 * signed two different results for one election is evidence worth keeping rather
 * than a race to smooth over.
 */
router.post('/proposal/:id/te_geg_dkg', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 404);
    }

    let snapshot;
    try {
      snapshot = parseCommitteeSnapshot(proposal.te_geg_config);
    } catch (err: any) {
      // No committee means there is nothing to authorise against. Refuse loudly
      // rather than storing an unverifiable submission.
      log.error(`[geg] ${proposalId}: ${err.message}`);
      return sendError(res, 'committee_not_configured', 503);
    }

    const { pkElection, committeePKs, keyperSig } = req.body || {};
    let pkCanon: string;
    let committeeCanon: string[];
    try {
      pkCanon = canonicalPoint(pkElection, 'pkElection', 96);
      if (!Array.isArray(committeePKs) || committeePKs.length === 0) {
        throw new GegDigestError('committeePKs: expected a non-empty array');
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

    const index = signer
      ? snapshot.keypers.findIndex(
          k => k.address.toLowerCase() === signer!.toLowerCase()
        )
      : -1;
    if (index === -1) {
      log.warn(
        `[geg] ${proposalId}: DKG submission from non-member ${signer ?? 'unrecoverable'}`
      );
      // 403 is what the protocol's client maps to an authorisation error; a 401
      // here would be read as a transport problem and retried.
      return sendError(res, 'not_a_registered_keyper', 403);
    }
    const keyperIndex = index + 1; // committee indices are 1-based

    const committeeJson = JSON.stringify(committeeCanon);
    const existing = await (db as any).queryAsync(
      'SELECT mpk_hex, committee_pks_hex FROM te_dkg_submissions WHERE proposal_id = ? AND keyper_index = ? LIMIT 1',
      [proposalId, keyperIndex]
    );
    if (existing[0]) {
      if (
        existing[0].mpk_hex !== pkCanon ||
        existing[0].committee_pks_hex !== committeeJson
      ) {
        log.warn(
          `[geg] ${proposalId}: keyper ${keyperIndex} changed its DKG submission`
        );
        return sendError(res, 'keyper_changed_submission', 409);
      }
    } else {
      await (db as any).queryAsync(
        `INSERT INTO te_dkg_submissions
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
    }

    const [{ c: matching }] = await (db as any).queryAsync(
      'SELECT COUNT(*) AS c FROM te_dkg_submissions WHERE proposal_id = ? AND mpk_hex = ? AND committee_pks_hex = ?',
      [proposalId, pkCanon, committeeJson]
    );
    const required = snapshot.thresholdT;

    if (Number(matching) >= required) {
      // `WHERE te_mpk IS NULL` makes finalisation atomic: concurrent submissions
      // race harmlessly because only the first UPDATE matches.
      await (db as any).queryAsync(
        'UPDATE proposals SET te_mpk = UNHEX(?), te_committee_pks = ? WHERE id = ? AND te_mpk IS NULL',
        [pkCanon.slice(2), committeeJson, proposalId]
      );
      log.info(
        `[geg] ${proposalId}: DKG finalised at ${matching}/${required} matching submissions`
      );
    } else {
      log.info(
        `[geg] ${proposalId}: DKG submission ${matching}/${required} from keyper ${keyperIndex}`
      );
    }

    // 204: the protocol's port defines this write as returning nothing.
    return res.status(204).end();
  } catch (err: any) {
    log.error(`[geg] te_geg_dkg ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/**
 * The aggregate a quorum of the committee agreed on, or `null` while none has.
 *
 * Returns the string `'split'` for the case that must never be smoothed over:
 * two distinct artifacts each reaching the quorum. Picking either would make the
 * tally depend on row order, so callers surface it as a 409.
 *
 * Resolved from the signed submissions rather than `proposals.te_aggregate`,
 * which the superseded single-writer tally path also writes.
 */
async function canonicalAggregateFor(
  proposalId: string,
  snapshot: { thresholdT: number }
): Promise<any | null | 'split'> {
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
  return parseJsonField<any>(reached[0].aggregate_json, null);
}

/**
 * One keyper's aggregate, and the quorum rule that makes one of them canonical.
 *
 * Three behaviours here are the protocol's, not choices — they mirror its own
 * reference store, and diverging from any of them strands an election:
 *
 *   **422 before voting closes.** An aggregate over a still-open ballot set is
 *   meaningless, and accepting one would let a keyper fix the tally early.
 *
 *   **Mutable until the quorum forms.** Unlike the one-shot DKG result, the
 *   aggregate is a deterministic re-derivation, so a keyper that submitted a
 *   stale one must be able to replace it — the coordinator explicitly asks the
 *   committee to re-derive when their submissions disagree. Rejecting a change
 *   would freeze that disagreement permanently. After the quorum, the set is
 *   frozen and a change is a 409.
 *
 *   **A split quorum is a 409, not a winner.** If two distinct aggregates each
 *   reach the quorum, returning either one would make the tally depend on row
 *   order. That is a committee failure and is surfaced as one.
 */
router.post('/proposal/:id/te_aggregate', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 404);
    }

    let snapshot;
    try {
      snapshot = parseCommitteeSnapshot(proposal.te_geg_config);
    } catch (err: any) {
      log.error(`[geg] ${proposalId}: ${err.message}`);
      return sendError(res, 'committee_not_configured', 503);
    }

    // 422 is what the protocol's client maps to its voting-window error; a 400
    // would be read as a malformed request and never retried.
    if (Math.floor(Date.now() / 1000) < Number(proposal.end)) {
      return sendError(res, 'aggregate submitted before voting_end', 422);
    }

    const { aggregate, keyperSig } = req.body || {};
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
    const index = signer
      ? snapshot.keypers.findIndex(
          k => k.address.toLowerCase() === signer.toLowerCase()
        )
      : -1;
    if (index === -1) {
      // Before blaming the roster, check whether this signature verifies under the
      // pre-scale tuple. A shape mismatch recovers to a valid-looking address that
      // is in no roster, so the two failures are indistinguishable from the signer
      // alone — and the roster is the misleading one to name.
      let preScaleSigner: string | null = null;
      try {
        preScaleSigner = recoverDigestSigner(
          aggregateDigestPreScale({
            electionId: proposalId,
            aggregates: canonical.aggregates,
            admitted: canonical.admitted,
            exclusions: canonical.exclusions,
            totalAdmittedWeight: canonical.totalAdmittedWeight
          }),
          keyperSig
        );
      } catch {
        preScaleSigner = null;
      }
      const preScaleMember =
        preScaleSigner &&
        snapshot.keypers.some(
          k => k.address.toLowerCase() === preScaleSigner!.toLowerCase()
        );
      if (preScaleMember) {
        log.warn(
          `[geg] ${proposalId}: aggregate from ${preScaleSigner} signed under the ` +
            `pre-scale digest format (4-field tally tuple); this keyper is running a ` +
            `build from before weight scaling`
        );
        return sendError(res, 'aggregate_pre_scale_digest', 409);
      }
      log.warn(
        `[geg] ${proposalId}: aggregate from non-member ${signer ?? 'unrecoverable'}`
      );
      return sendError(res, 'not_a_registered_keyper', 403);
    }
    const keyperIndex = index + 1; // committee indices are 1-based
    const digestHex = `0x${digest.toString('hex')}`;
    const aggregateJson = JSON.stringify(canonical);

    const existing = await (db as any).queryAsync(
      'SELECT digest FROM te_aggregate_submissions WHERE proposal_id = ? AND keyper_index = ? LIMIT 1',
      [proposalId, keyperIndex]
    );
    if (existing[0]?.digest === digestHex) {
      return res.status(204).end(); // idempotent resend of this keyper's own row
    }
    if (existing[0] && proposal.te_aggregate) {
      log.warn(
        `[geg] ${proposalId}: keyper ${keyperIndex} changed its aggregate after the quorum`
      );
      return sendError(
        res,
        'aggregate already finalized (quorum reached)',
        409
      );
    }

    await (db as any).queryAsync(
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
        signer,
        aggregateJson,
        digestHex,
        keyperSig,
        Math.floor(Date.now() / 1000)
      ]
    );

    const groups = await (db as any).queryAsync(
      'SELECT digest, COUNT(*) AS c FROM te_aggregate_submissions WHERE proposal_id = ? GROUP BY digest',
      [proposalId]
    );
    const required = snapshot.thresholdT;
    const reached = groups.filter((g: any) => Number(g.c) >= required);

    if (reached.length > 1) {
      log.error(
        `[geg] ${proposalId}: ${reached.length} distinct aggregates each reached the quorum of ${required}`
      );
      return sendError(res, 'aggregate: split quorum', 409);
    }

    if (reached.length === 1) {
      // `WHERE te_aggregate IS NULL` makes promotion atomic: concurrent
      // submissions race harmlessly because only the first UPDATE matches.
      const winner = await (db as any).queryAsync(
        'SELECT aggregate_json FROM te_aggregate_submissions WHERE proposal_id = ? AND digest = ? LIMIT 1',
        [proposalId, reached[0].digest]
      );
      await (db as any).queryAsync(
        'UPDATE proposals SET te_aggregate = ? WHERE id = ? AND te_aggregate IS NULL',
        [winner[0].aggregate_json, proposalId]
      );
      log.info(
        `[geg] ${proposalId}: aggregate canonical at ${reached[0].c}/${required} matching submissions`
      );
    } else {
      const mine = groups.find((g: any) => g.digest === digestHex);
      log.info(
        `[geg] ${proposalId}: aggregate submission ${mine?.c ?? 1}/${required} from keyper ${keyperIndex}`
      );
    }

    return res.status(204).end();
  } catch (err: any) {
    log.error(`[geg] te_aggregate ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/**
 * The canonical aggregate, or null while the committee has not agreed on one.
 *
 * Resolved from the submissions rather than read back from
 * `proposals.te_aggregate`. That column is also written by the superseded
 * single-writer tally path, whose artifact is a bare ciphertext sum with no
 * admitted set, no exclusions and no total weight — serving it here would hand
 * the committee something that only looks like an aggregate, and the protocol
 * would either fail to decode it or, worse, act on a tally nobody signed.
 * Resolving from the signed submissions cannot be polluted that way.
 */
router.get('/proposal/:id/te_geg_aggregate', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 404);
    }

    let snapshot;
    try {
      snapshot = parseCommitteeSnapshot(proposal.te_geg_config);
    } catch (err: any) {
      log.error(`[geg] ${proposalId}: ${err.message}`);
      return sendError(res, 'committee_not_configured', 503);
    }

    const canonical = await canonicalAggregateFor(proposalId, snapshot);

    // Two artifacts at quorum is a committee failure, not a tie to break:
    // returning either would make the tally depend on row order.
    if (canonical === 'split') {
      log.error(
        `[geg] ${proposalId}: distinct aggregates each reached the quorum`
      );
      return sendError(res, 'aggregate: split quorum', 409);
    }

    return res.json({ aggregate: canonical });
  } catch (err: any) {
    log.error(`[geg] te_geg_aggregate ${proposalId}: ${err?.message || err}`);
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
 * Check a keyper's DLEQ proofs before storing its shares.
 *
 * Storage is append-only, so an unverified share would be permanent: the first
 * one recorded is the one every later recovery uses. A bad proof caught here is
 * a 400 the keyper can act on; the same proof stored and discovered later is an
 * election that cannot be tallied and cannot be corrected.
 *
 * This duplicates a check the committee also performs — deliberately. It is the
 * one place the hub can independently confirm that what it is about to keep
 * forever actually decrypts the aggregate it agreed on.
 */
async function verifyShareProofs(
  proposalId: string,
  keyperIndex: number,
  entries: Array<{ sigma: string; proof: string }>,
  aggregates: Array<{ c1: string; c2: string }>,
  committeePKs: string[]
): Promise<number | null> {
  await ensureCurves();
  const hex = (v: string) => Buffer.from(String(v).replace(/^0x/, ''), 'hex');
  const pkHex = committeePKs[keyperIndex - 1];
  if (!pkHex) return -1; // no published key for this member

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
 * Ordering is the whole point of the two window checks. A share is a partial
 * decryption *of a specific ciphertext*, so it is meaningless until the
 * committee has agreed which ciphertext that is:
 *
 *   - before voting closes there is no final ballot set;
 *   - before a canonical aggregate exists there is no agreed sum to decrypt,
 *     and a share computed against a candidate aggregate that later loses the
 *     quorum would be silently wrong rather than visibly rejected.
 *
 * Both answer 422 — the protocol's voting-window error — because the condition
 * is temporary and the caller should retry, unlike a 400.
 *
 * Shares are append-only: unlike the aggregate, a share is not a re-derivable
 * artifact the committee converges on, and `INSERT IGNORE` semantics mean the
 * first one stored is permanent — so a second, different submission from the
 * same keyper is a 409 rather than an overwrite.
 *
 * The envelope is per keyper across all candidates; storage is per (keyper,
 * candidate), which is what the existing audit surface and the legacy verifier
 * read. The split happens here rather than in the translator because the
 * signature covers the whole entries list: only a party holding the complete
 * envelope can verify it.
 */
router.post('/proposal/:id/te_geg_decryption_share', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 404);
    }

    let snapshot;
    try {
      snapshot = parseCommitteeSnapshot(proposal.te_geg_config);
    } catch (err: any) {
      log.error(`[geg] ${proposalId}: ${err.message}`);
      return sendError(res, 'committee_not_configured', 503);
    }

    if (Math.floor(Date.now() / 1000) < Number(proposal.end)) {
      return sendError(
        res,
        'decryption share submitted before voting_end',
        422
      );
    }

    const canonical = await canonicalAggregateFor(proposalId, snapshot);
    if (canonical === 'split') {
      return sendError(res, 'aggregate: split quorum', 409);
    }
    if (!canonical) {
      return sendError(
        res,
        'decryption share submitted before a canonical aggregate exists',
        422
      );
    }

    const { share, keyperSig } = req.body || {};
    if (typeof keyperSig !== 'string') {
      return sendError(res, 'keyperSig: expected a string', 400);
    }
    const entries = Array.isArray(share?.entries) ? share.entries : null;
    if (!entries || entries.length === 0) {
      return sendError(res, 'share.entries: expected a non-empty array', 400);
    }
    if (entries.length !== canonical.aggregates.length) {
      // A short entries list decodes to a shorter tuple and would silently
      // corrupt recovery for the candidates it omits.
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
    const index = signer
      ? snapshot.keypers.findIndex(
          k => k.address.toLowerCase() === signer.toLowerCase()
        )
      : -1;
    if (index === -1) {
      log.warn(
        `[geg] ${proposalId}: decryption share from non-member ${signer ?? 'unrecoverable'}`
      );
      return sendError(res, 'not_a_registered_keyper', 403);
    }
    const keyperIndex = index + 1;

    // The envelope names its own index; the signature decides. A mismatch means
    // a keyper is claiming someone else's slot in the committee.
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
        `[geg] ${proposalId}: keyper ${keyperIndex} already submitted different shares`
      );
      return sendError(res, 'keyper already submitted different shares', 409);
    }

    const committeePKs = parseJsonField<string[]>(
      proposal.te_committee_pks,
      []
    );
    const badCandidate = await verifyShareProofs(
      proposalId,
      keyperIndex,
      entries,
      canonical.aggregates,
      committeePKs
    );
    if (badCandidate !== null) {
      log.error(
        `[geg] ${proposalId}: keyper ${keyperIndex} DLEQ invalid for candidate ${badCandidate}`
      );
      return sendError(res, 'invalid_dleq_proof', 400);
    }

    const now = Math.floor(Date.now() / 1000);
    for (let candidate = 0; candidate < entries.length; candidate++) {
      const sigma = String(entries[candidate].sigma || '').replace(/^0x/, '');
      const proof = String(entries[candidate].proof || '').replace(/^0x/, '');
      if (sigma.length !== 192 || proof.length !== 128) {
        return sendError(res, `entries[${candidate}]: malformed`, 400);
      }
      await (db as any).queryAsync(
        `INSERT IGNORE INTO te_decryption_shares
           (proposal_id, keyper_index, candidate, sigma, proof_e, proof_z, posted_at)
         VALUES (?, ?, ?, UNHEX(?), UNHEX(?), UNHEX(?), ?)`,
        [
          proposalId,
          keyperIndex,
          candidate,
          sigma,
          proof.slice(0, 64),
          proof.slice(64),
          now
        ]
      );
    }

    log.info(
      `[geg] ${proposalId}: decryption shares from keyper ${keyperIndex} (${entries.length} candidates)`
    );
    return res.status(204).end();
  } catch (err: any) {
    log.error(
      `[geg] te_geg_decryption_share ${proposalId}: ${err?.message || err}`
    );
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/**
 * Every keyper's shares, grouped back into the per-keyper envelopes the port
 * defines. A keyper missing an entry for any candidate is omitted entirely: a
 * partial envelope decodes to a shorter tuple and would corrupt recovery rather
 * than fail it.
 */
router.get('/proposal/:id/te_geg_decryption_shares', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 404);
    }

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
      `[geg] te_geg_decryption_shares ${proposalId}: ${err?.message || err}`
    );
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/**
 * The published tally, signed by the result publisher.
 *
 * Authorisation differs from every other write here: this one is not a
 * committee member but the single `resultPublisherKey` frozen into the config —
 * the coordinator that recovered the totals. Recovery itself is not re-done
 * here; what the hub guarantees is that the artifact it stores is the one that
 * key signed, over these exact numbers.
 *
 * The signature binds the totals (upstream `GEG-RESULT-v1`). An earlier form
 * signed only (operation, election), which meant one captured signature
 * authorised *any* totals for that proposal — so this route deliberately fails
 * closed on a digest mismatch rather than trusting the caller's identity alone.
 *
 * Write-once: a result is the terminal artifact of an election, and a second
 * one would mean two different published outcomes. Identical resends are a
 * no-op so a coordinator retry after a dropped response is not an error.
 */
router.post('/proposal/:id/te_result', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 404);
    }

    let snapshot;
    try {
      snapshot = parseCommitteeSnapshot(proposal.te_geg_config);
    } catch (err: any) {
      log.error(`[geg] ${proposalId}: ${err.message}`);
      return sendError(res, 'committee_not_configured', 503);
    }

    // Re-read the body from the raw text: totals routinely exceed 2^53, and the
    // parsed copy express handed us has already rounded them.
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

    // The publisher signs the *operation*, with the artifact digest as its
    // payload — not the artifact digest on its own. Verifying the inner digest
    // alone recovers a valid-looking address that simply is not the publisher's,
    // so the failure reads as "signed by a stranger" rather than as a mismatch.
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
        `[geg] ${proposalId}: result from ${signer ?? 'unrecoverable'}, not the result publisher`
      );
      return sendError(res, 'not_the_result_publisher', 403);
    }

    const totalsJson = JSON.stringify(result.totals.map((t: any) => String(t)));
    const indicesJson = JSON.stringify(
      result.keyperIndices.map((k: any) => Number(k))
    );
    const bsgsBound = String(result.bsgsBound);

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
      log.warn(`[geg] ${proposalId}: a different result was already published`);
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
    log.info(`[geg] ${proposalId}: result published, totals ${totalsJson}`);
    return res.status(204).end();
  } catch (err: any) {
    log.error(`[geg] te_result ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/**
 * The published tally, or null.
 *
 * Totals are emitted as JSON *numbers* because that is what the protocol's codec
 * decodes — but they are stored as strings, so anything above 2^53 is written
 * into the response text from the stored decimal rather than round-tripped
 * through a double.
 */
router.get('/proposal/:id/te_result', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 404);
    }

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
    log.error(`[geg] te_result ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/**
 * Mark a tally stalled, or clear it — two different writes wearing one route.
 *
 * The authorisation is **direction-split**, and that split is the whole design:
 *
 *   - `stalled: true` may only be signed by the `resultPublisherKey` — the
 *     coordinator, the one party that knows it has exhausted its attempts;
 *   - `stalled: false` may only be signed by one of the proposal's space admins
 *     (or its author, when the space lists none) — see `resumeAuthorities`.
 *
 * If the coordinator could clear a stall, a restart would clear it: its retry
 * budget lives in memory, so a fresh process sees a stalled election, tries
 * again, and stalls again — an election looping quietly forever instead of
 * waiting for a human. Requiring a different identity to resume makes "someone
 * looked at this" a precondition rather than a hope.
 *
 * Both directions sign the same operation wrapper the result write uses, with
 * the direction encoded in the op name (`tally_stall` / `tally_resume`) and an
 * empty payload — so a stall signature cannot be replayed as a resume.
 */
/**
 * Who may clear a stalled tally: the proposal's **space admins**, live.
 *
 * Falls back to the proposal's author when a space lists no admins, so a stall is
 * never unrecoverable. Moderators are excluded: retrying is operational rather than
 * moderation.
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

router.post('/proposal/:id/te_tally_stalled', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 404);
    }

    let snapshot;
    try {
      snapshot = parseCommitteeSnapshot(proposal.te_geg_config);
    } catch (err: any) {
      log.error(`[geg] ${proposalId}: ${err.message}`);
      return sendError(res, 'committee_not_configured', 503);
    }

    const stalled = req.body?.stalled;
    const sig = req.body?.resultPublisherSig ?? req.body?.adminSig;
    if (typeof stalled !== 'boolean') {
      return sendError(res, 'stalled: expected a boolean', 400);
    }
    // Optional, unsigned, and truncated rather than rejected on length: a stall
    // must never fail to record because its explanation was malformed. The flag is
    // what carries authority; this only tells an operator where to look.
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

    // The signature must say *when* it was made, and that timestamp must be
    // recent and unused. Without it the digest binds only the operation and the
    // election, so one observed stall stays valid forever — replayed after each
    // admin retry, it keeps a confidential tally from ever completing.
    const issuedAt = req.body?.issuedAt;
    if (!Number.isInteger(issuedAt) || issuedAt < 0) {
      return sendError(res, 'issuedAt: expected a unix timestamp', 400);
    }
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - issuedAt) > REQUEST_FRESHNESS_S) {
      log.warn(
        `[geg] ${proposalId}: ${op} issuedAt ${issuedAt} is outside the ±${REQUEST_FRESHNESS_S}s window (now ${now})`
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
        `[geg] ${proposalId}: ${op} from ${signer ?? 'unrecoverable'}, expected one of ${expected.join(', ')}`
      );
      return sendError(
        res,
        stalled ? 'not_the_result_publisher' : 'not_the_admin',
        403
      );
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
          `[geg] ${proposalId}: ${op} reused nonce ${issuedAt}${
            already ? ' (no-op, already in that state)' : ' — REJECTED'
          }`
        );
        if (already) return res.status(204).end();
        return sendError(res, 'this request has already been used', 409);
      }
      throw err;
    }
    // Nothing outside the window can be accepted again, so only rows that could
    // still be replayed are worth keeping.
    await (db as any).queryAsync(
      'DELETE FROM te_request_nonces WHERE accepted_at < ?',
      [now - REQUEST_FRESHNESS_S]
    );

    await (db as any).queryAsync(
      'UPDATE proposals SET te_tally_stalled = ?, te_tally_stall_reason = ? WHERE id = ? LIMIT 1',
      // Resume clears the reason with the flag: a stale explanation attached to a
      // running tally is worse than none.
      [stalled ? 1 : 0, reason, proposalId]
    );
    log.info(
      `[geg] ${proposalId}: tally ${stalled ? 'marked stalled' : 'resumed by admin'}`
    );
    return res.status(204).end();
  } catch (err: any) {
    log.error(`[geg] te_tally_stalled ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

/** Every DKG submission recorded so far, for the auditor and the coordinator. */
router.get('/proposal/:id/te_geg_dkg', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 404);
    }
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
    log.error(`[geg] te_geg_dkg read ${proposalId}: ${err?.message || err}`);
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

export default router;
