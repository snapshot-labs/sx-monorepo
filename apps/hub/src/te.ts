/**
 * The public audit surface for a permanently-private proposal.
 *
 * Read-only, unauthenticated, and deliberately so: everything served here is
 * already public by construction. The ballots are permanently encrypted, the
 * decryption shares carry DLEQ proofs meant to be checked by strangers, and the
 * voting power attached to each ballot is the same figure Snapshot shows for any
 * ordinary vote. What the surface buys is the ability for someone who trusts
 * nobody here to recompute the result themselves.
 *
 * **This file used to authorise writes as well.** `POST /te_dkg` and
 * `POST /te_decryption_share` accepted keyper submissions under the `SX-TE-DKG-v1`
 * and `SX-TE-DECRYPT-v1` digests, which were this repository's own invention and
 * matched nothing outside it. Those writes now belong to `geg.ts`, under the
 * protocol's `GEG-*` digests, verified against the committee frozen into each
 * proposal — see `helpers/gegDigests.ts`. Only the reads stayed, because the verify
 * panel is built on them and the protocol's own read routes return protocol shapes
 * rather than the `{voter, vp, choice}` a client needs to re-aggregate.
 *
 * The one subtlety left in here is `auditAggregate`; its own comment explains why.
 */

import { capture } from '@snapshot-labs/snapshot-sentry';
import express from 'express';
import { deriveScale } from './helpers/gegConfig';
import db from './helpers/mysql';
import { sendError } from './helpers/utils';

const router = express.Router();

async function loadProposal(proposalId: string): Promise<any | null> {
  const rows = await (db as any).queryAsync(
    'SELECT id, privacy, te_mpk, te_config, te_geg_config, te_committee_pks, te_keyper_addresses, te_threshold_t, te_threshold_n, te_aggregate FROM proposals WHERE id = ? LIMIT 1',
    [proposalId]
  );
  return rows[0] || null;
}

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

/**
 * Present the stored aggregate to the audit surface.
 *
 * The committee's artifact names its ciphertexts `aggregates`; this surface
 * predates it and its readers ask for `ciphertexts` and `num_candidates`. Both
 * sets of keys are emitted so the verify panel keeps working — it reads
 * `aggregate.ciphertexts.length`, so serving only the new names is not a
 * rename, it is a crash.
 *
 * The protocol fields ride along rather than being stripped: `admitted` and
 * `exclusions` let a verifier recompute over exactly the ballots the committee
 * counted, which is a stronger check than the old surface could offer.
 */
function auditAggregate(raw: unknown, proposalId: string): any | null {
  const aggregate = parseJsonField<any>(raw, null);
  if (!aggregate) return null;
  if (!Array.isArray(aggregate.aggregates) || aggregate.ciphertexts) {
    return aggregate;
  }
  return {
    ...aggregate,
    election_id: aggregate.electionId ?? proposalId,
    num_candidates: aggregate.aggregates.length,
    ciphertexts: aggregate.aggregates
  };
}

router.get('/proposal/:id/te_aggregate', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 400);
    }
    const aggregate = auditAggregate(proposal.te_aggregate, proposalId);
    if (!aggregate) return sendError(res, 'aggregate_not_ready', 404);
    return res.json(aggregate);
  } catch (err: any) {
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

// Every committed decryption share plus the public DKG outputs an auditor needs
// to check the published result. The shares and their DLEQ proofs are designed
// to be public, so there is nothing here to authenticate.
//
// `te_result` carries the committee's totals as **decimal strings**, which is how
// `te_results` stores them, and it matters that they stay strings the whole way to
// the verifier. A tally can exceed 2^53, past which a JSON number is no longer the
// integer the keypers decrypted — and the check the auditor runs is an exact
// equality in the group, so a value that is off by one rounding step does not
// "nearly" verify, it fails.
router.get('/proposal/:id/te_decryption_shares', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 400);
    }
    if (!proposal.te_mpk) {
      return sendError(res, 'dkg_not_finalized', 400);
    }
    const aggregate = auditAggregate(proposal.te_aggregate, proposalId);
    const rows = await (db as any).queryAsync(
      'SELECT keyper_index, candidate, HEX(sigma) AS sigma_hex, HEX(proof_e) AS proof_e_hex, HEX(proof_z) AS proof_z_hex FROM te_decryption_shares WHERE proposal_id = ? ORDER BY candidate, keyper_index',
      [proposalId]
    );
    const resultRows = await (db as any).queryAsync(
      'SELECT totals_json, keyper_indices, bsgs_bound FROM te_results WHERE proposal_id = ? LIMIT 1',
      [proposalId]
    );
    const publishedResult = resultRows[0]
      ? {
          totals: parseJsonField<string[]>(resultRows[0].totals_json, []).map(
            String
          ),
          keyper_indices: parseJsonField<number[]>(
            resultRows[0].keyper_indices,
            []
          ),
          bsgs_bound: String(resultRows[0].bsgs_bound)
        }
      : null;
    return res.json({
      te_mpk: `0x${Buffer.from(proposal.te_mpk).toString('hex')}`,
      te_config: parseJsonField<any>(proposal.te_config, null),
      te_committee_pks: parseJsonField<any>(proposal.te_committee_pks, []),
      te_threshold_t: Number(proposal.te_threshold_t),
      te_threshold_n: Number(proposal.te_threshold_n),
      te_keyper_addresses: parseJsonField<any>(
        proposal.te_keyper_addresses,
        []
      ),
      aggregate,
      te_result: publishedResult,
      shares: (rows as any[]).map(r => ({
        keyper_index: Number(r.keyper_index),
        candidate: Number(r.candidate),
        sigma: `0x${r.sigma_hex.toLowerCase()}`,
        proof_e: `0x${r.proof_e_hex.toLowerCase()}`,
        proof_z: `0x${r.proof_z_hex.toLowerCase()}`
      }))
    });
  } catch (err: any) {
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

// Every individual encrypted ballot with the voting power it was counted with.
// The choice envelope never reveals how the voter voted, so exposing it leaks
// nothing the tally does not already imply, and the voting power is public
// information — it is shown for every normal Snapshot vote and is independently
// recomputable from the proposal's strategies. An auditor uses this to recompute
// the voting-power-weighted homomorphic aggregate and confirm it equals the
// published one, which is what closes the "did anyone sum the real ballots?" gap.
router.get('/proposal/:id/te_ballots', async (req, res) => {
  const proposalId = req.params.id;
  try {
    const proposal = await loadProposal(proposalId);
    if (!proposal) return sendError(res, 'proposal_not_found', 404);
    if (proposal.privacy !== 'shutter-elgamal') {
      return sendError(res, 'proposal_not_private', 400);
    }
    if (!proposal.te_mpk) {
      return sendError(res, 'dkg_not_finalized', 400);
    }
    const rows = await (db as any).queryAsync(
      // cb != -3 excludes soft-deleted votes (CB.PENDING_DELETE in sequencer/constants.ts)
      `SELECT voter, vp, choice FROM votes
        WHERE proposal = ? AND cb != -3
        ORDER BY created ASC, id ASC`,
      [proposalId]
    );
    const teConfig = parseJsonField<any>(proposal.te_config, null);
    // The unit the committee's aggregation counts in. A verifier must apply the same
    // divisor or its recomputed aggregate will not match, so this travels with the
    // ballots rather than being inferred.
    const snapshot = parseJsonField<any>(proposal.te_geg_config, null);
    const scale = deriveScale(
      Number(teConfig?.budget ?? 1),
      Number(snapshot?.maxTotalWeight ?? 0),
      Number(snapshot?.solverCeiling ?? Infinity)
    );

    return res.json({
      te_mpk: `0x${Buffer.from(proposal.te_mpk).toString('hex')}`,
      te_config: teConfig,
      scale,
      ballots: (rows as any[]).map((r, i) => ({
        sequenceNumber: i,
        voter: r.voter,
        vp: Number(r.vp),
        choice: parseJsonField<any>(r.choice, null)
      }))
    });
  } catch (err: any) {
    capture(err);
    return sendError(res, 'server_error', 500);
  }
});

export default router;
