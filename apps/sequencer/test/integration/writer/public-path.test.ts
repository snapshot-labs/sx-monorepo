/**
 * Public proposals must behave as they did before private voting was added.
 * Every private-voting path is gated on `privacy = 'shutter-elgamal'`. If a
 * public proposal reached the tally scheduler, its scores would be overwritten.
 *
 * Checks that:
 *   1. creating a public proposal writes no `te_*` column;
 *   2. the tally scheduler (its real exported query) never selects it;
 *   3. a private proposal in the same database is selected, so (2) is not passing
 *      just because the query is broken or the table is empty.
 */

import * as actionHelper from '../../../src/helpers/actions';
import db, { sequencerDB } from '../../../src/helpers/mysql';
import { selectTallyCandidates } from '../../../src/helpers/teTallyScheduler';
import { action } from '../../../src/writer/proposal';
import { insertProposal } from '../../fixtures/proposal';
import { spacesGetSpaceFixtures } from '../../fixtures/space';
import input from '../../fixtures/writer-payload/proposal.json';

jest.mock('../../../src/helpers/moderation', () => {
  const originalModule = jest.requireActual('../../../src/helpers/moderation');
  return {
    __esModule: true,
    ...originalModule,
    containsFlaggedLinks: () => false
  };
});

const getSpaceMock = jest.spyOn(actionHelper, 'getSpace');
getSpaceMock.mockResolvedValue(spacesGetSpaceFixtures);

const PUBLIC_ID = '0xd14-public';
const PRIVATE_ID = '0xd14-private';

/** Every column the private-voting feature added to `proposals`. */
const TE_COLUMNS = [
  'te_sgp_config',
  'te_config',
  'te_mpk',
  'te_committee_pks',
  'te_keyper_addresses',
  'te_threshold_t',
  'te_threshold_n',
  'te_aggregate'
];

describe('D14: public voting is untouched by private voting', () => {
  beforeAll(async () => {
    await db.queryAsync('DELETE FROM proposals WHERE id IN (?)', [
      [PUBLIC_ID, PRIVATE_ID]
    ]);
    // The fixture payload has no `privacy` key, so this creates a public proposal.
    await action(input, 'ipfs', 'receipt', PUBLIC_ID);
  });

  afterAll(async () => {
    await db.queryAsync('DELETE FROM proposals WHERE id IN (?)', [
      [PUBLIC_ID, PRIVATE_ID]
    ]);
    await db.queryAsync('DELETE FROM te_results WHERE proposal_id IN (?)', [
      [PUBLIC_ID, PRIVATE_ID]
    ]);
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  it('does not mark the proposal private and writes no te_* column', async () => {
    const [proposal] = await db.queryAsync(
      `SELECT privacy, ${TE_COLUMNS.join(', ')}, te_tally_stalled FROM proposals WHERE id = ?`,
      [PUBLIC_ID]
    );
    expect(proposal).toBeDefined();
    expect(proposal.privacy).not.toBe('shutter-elgamal');
    for (const column of TE_COLUMNS) {
      expect({ column, value: proposal[column] }).toEqual({
        column,
        value: null
      });
    }
    // Not nullable; defaults to 0 ("not stalled").
    expect(Number(proposal.te_tally_stalled)).toBe(0);
  });

  describe('the tally scheduler', () => {
    it('skips a private proposal whose result is not published yet', async () => {
      const [result] = await db.queryAsync(
        'SELECT * FROM te_results WHERE proposal_id = ?',
        [PRIVATE_ID]
      );
      await db.queryAsync('DELETE FROM te_results WHERE proposal_id = ?', [
        PRIVATE_ID
      ]);
      try {
        const ids = (
          await selectTallyCandidates(Math.floor(Date.now() / 1e3))
        ).map(p => p.id);
        expect(ids).not.toContain(PRIVATE_ID);
      } finally {
        await db.queryAsync('INSERT INTO te_results SET ?', result);
      }
    });

    // A private proposal that meets every scheduler condition: closed, not final,
    // key present, not stalled.
    beforeAll(async () => {
      await insertProposal({
        id: PRIVATE_ID,
        author: '0x0000000000000000000000000000000000000001',
        type: 'weighted',
        title: 'private control',
        start: 1,
        end: 2,
        privacy: 'shutter-elgamal',
        te_mpk: Buffer.alloc(96, 1)
      });
      // Give both a published result, since the scheduler skips proposals
      // without one.
      for (const id of [PRIVATE_ID, PUBLIC_ID]) {
        await db.queryAsync('REPLACE INTO te_results SET ?', {
          proposal_id: id,
          totals_json: '["0","0"]',
          keyper_indices: '[1,2]',
          bsgs_bound: '0',
          signature: '0x',
          posted_at: 1
        });
      }
    });

    // The public proposal has no `te_mpk`, so it would be skipped for that alone.
    // Here it meets every other condition, so only the `privacy` check keeps it
    // out, and the private control shows the query is working.
    it('excludes the public one on privacy alone, not on a missing key', async () => {
      await db.queryAsync(
        `UPDATE proposals
            SET te_mpk = ?, end = 2, scores_state = 'pending', te_tally_stalled = 0
          WHERE id = ?`,
        [Buffer.alloc(96, 2), PUBLIC_ID]
      );
      try {
        const ids = (
          await selectTallyCandidates(Math.floor(Date.now() / 1e3))
        ).map(p => p.id);
        expect(ids).toContain(PRIVATE_ID); // the query is working...
        expect(ids).not.toContain(PUBLIC_ID); // ...and privacy is what excludes it
      } finally {
        await db.queryAsync('UPDATE proposals SET te_mpk = NULL WHERE id = ?', [
          PUBLIC_ID
        ]);
      }
    });
  });
});
