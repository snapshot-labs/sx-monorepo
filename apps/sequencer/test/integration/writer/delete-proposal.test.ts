/**
 * Deleting a private proposal also deletes its private-voting rows.
 */

import * as actionHelper from '../../../src/helpers/actions';
import db, { sequencerDB } from '../../../src/helpers/mysql';
import { action } from '../../../src/writer/delete-proposal';
import { insertProposal } from '../../fixtures/proposal';
import { spacesGetSpaceFixtures } from '../../fixtures/space';

const AUTHOR = '0xFC01614d28595d9ea5963daD9f44C0E0F0fE10f0';
const SPACE = 'test.eth';
const ID = '0xdel-private-children';

const getSpaceMock = jest.spyOn(actionHelper, 'getSpace');
getSpaceMock.mockResolvedValue(spacesGetSpaceFixtures);

describe('delete-proposal: private proposals', () => {
  afterAll(async () => {
    await db.queryAsync('DELETE FROM proposals WHERE space = ?', [SPACE]);
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  // There are no foreign keys, so nothing cascades: the writer must delete these
  // rows itself.
  it('removes the committee artifacts along with the proposal', async () => {
    await insertProposal({
      id: ID,
      start: 1_600_000_000,
      end: 1_600_000_100,
      privacy: 'shutter-elgamal',
      scores_state: 'final'
    });
    await db.queryAsync('INSERT INTO te_results SET ?', {
      proposal_id: ID,
      totals_json: '["1"]',
      keyper_indices: '[1,2]',
      bsgs_bound: '100',
      signature: `0x${'11'.repeat(65)}`,
      posted_at: 1
    });
    await db.queryAsync('INSERT INTO te_decryption_shares SET ?', {
      proposal_id: ID,
      keyper_index: 1,
      candidate: 0,
      sigma: Buffer.alloc(96, 1),
      proof_e: Buffer.alloc(32, 1),
      proof_z: Buffer.alloc(32, 1),
      posted_at: 1
    });
    await db.queryAsync('INSERT INTO te_dkg_submissions SET ?', {
      proposal_id: ID,
      keyper_index: 1,
      keyper_address: AUTHOR,
      mpk_hex: `0x${'aa'.repeat(96)}`,
      committee_pks_hex: '[]',
      signature: `0x${'22'.repeat(65)}`,
      posted_at: 1
    });
    await db.queryAsync('INSERT INTO te_aggregate_submissions SET ?', {
      proposal_id: ID,
      keyper_index: 1,
      keyper_address: AUTHOR,
      aggregate_json: '{}',
      digest: `0x${'44'.repeat(32)}`,
      signature: `0x${'55'.repeat(65)}`,
      posted_at: 1
    });
    await db.queryAsync('INSERT INTO te_revote_nonces SET ?', {
      proposal_id: ID,
      pseudonym: `0x${'33'.repeat(32)}`,
      last: 2,
      updated: 1
    });
    await db.queryAsync('INSERT INTO te_request_nonces SET ?', {
      proposal_id: ID,
      op: 'tally_stall',
      issued_at: 1,
      accepted_at: 1
    });

    await action({
      address: AUTHOR,
      msg: JSON.stringify({ space: SPACE, payload: { proposal: ID } })
    });

    const rows = await db.queryAsync('SELECT id FROM proposals WHERE id = ?', [
      ID
    ]);
    expect(rows).toHaveLength(0);
    for (const table of [
      'te_results',
      'te_decryption_shares',
      'te_dkg_submissions',
      'te_aggregate_submissions',
      'te_revote_nonces',
      'te_request_nonces'
    ]) {
      const orphans = await db.queryAsync(
        `SELECT proposal_id FROM ${table} WHERE proposal_id = ?`,
        [ID]
      );
      expect({ table, orphans: orphans.length }).toEqual({ table, orphans: 0 });
    }
  });
});
