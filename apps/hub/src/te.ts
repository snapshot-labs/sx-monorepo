/**
 * Read-only, unauthenticated audit routes for private (shutter-elgamal) proposals,
 * so anyone can recompute the result. Everything served is already public:
 * ballots stay encrypted and decryption shares come with DLEQ proofs.
 */

import { capture } from '@snapshot-labs/snapshot-sentry';
import express from 'express';
import db from './helpers/mysql';
import { parseJsonField, sendError } from './helpers/utils';

const router = express.Router();

async function loadProposal(proposalId: string): Promise<any | null> {
  const rows = await (db as any).queryAsync(
    'SELECT id, privacy, te_mpk, te_config, te_sgp_config, te_committee_pks, te_keyper_addresses, te_threshold_t, te_threshold_n, te_aggregate FROM proposals WHERE id = ? LIMIT 1',
    [proposalId]
  );
  return rows[0] || null;
}

/**
 * The stored aggregate, with `election_id`, `num_candidates` and `ciphertexts`
 * added next to the committee's `aggregates`, because the UI verify panel reads
 * those names. `admitted` and `exclusions` are kept so a verifier can recompute
 * over exactly the ballots the committee counted.
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

// All decryption shares plus the public DKG outputs needed to check the published
// result. `te_result.totals` are decimal strings, because a tally can exceed 2^53
// and the verifier needs the exact integers.
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

export default router;
