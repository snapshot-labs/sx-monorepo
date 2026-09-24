/**
 * Backward compatibility for public voting (D14).
 *
 * The whole private-voting feature is built on one invariant: every path it adds
 * is gated on `privacy = 'shutter-elgamal'`, so a proposal that does not opt in
 * behaves exactly as it did before any of this existed. That invariant is load
 * bearing — most Snapshot proposals are public — and it is the kind that breaks
 * silently. A stray write to a `te_*` column costs nothing visible; a public
 * proposal wandering into the tally scheduler would have its scores overwritten
 * by a threshold tally that has no key, no committee, and no ballots.
 *
 * So this pins the three places a leak could happen, from the outside:
 *
 *   1. creation writes no `te_*` column;
 *   2. the tally scheduler never selects it — asserted against the scheduler's
 *      own exported predicate, not a copy, so deleting the gate fails here;
 *   3. a private proposal in the same database *is* selected, which is what
 *      makes (2) evidence of a gate rather than of an empty table.
 *
 * Point 3 matters more than it looks. A test that only asserts "the public
 * proposal was not selected" passes just as well when the query is broken, the
 * table is empty, or the fixture never saved.
 */

import * as actionHelper from '../../../src/helpers/actions';
import db, { sequencerDB } from '../../../src/helpers/mysql';
import { selectTallyCandidates } from '../../../src/helpers/teTallyScheduler';
import { action } from '../../../src/writer/proposal';
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
  'te_geg_config',
  'te_config',
  'te_mpk',
  'te_committee_pks',
  'te_keyper_urls',
  'te_keyper_addresses',
  'te_threshold_t',
  'te_threshold_n',
  'te_aggregate',
  'te_dkg_status'
];

describe('D14: public voting is untouched by private voting', () => {
  beforeAll(async () => {
    await db.queryAsync('DELETE FROM proposals WHERE id IN (?)', [
      [PUBLIC_ID, PRIVATE_ID]
    ]);
    // The fixture payload carries no `privacy` key at all — that is precisely a
    // public proposal, created through the same writer a real one goes through.
    await action(input, 'ipfs', 'receipt', PUBLIC_ID);
  });

  afterAll(async () => {
    await db.queryAsync('DELETE FROM proposals WHERE id IN (?)', [
      [PUBLIC_ID, PRIVATE_ID]
    ]);
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  it('does not mark the proposal private', async () => {
    const [proposal] = await db.queryAsync(
      'SELECT privacy FROM proposals WHERE id = ?',
      [PUBLIC_ID]
    );
    expect(proposal).toBeDefined();
    expect(proposal.privacy).not.toBe('shutter-elgamal');
  });

  it('writes no te_* column', async () => {
    const [proposal] = await db.queryAsync(
      `SELECT ${TE_COLUMNS.join(', ')}, te_tally_stalled FROM proposals WHERE id = ?`,
      [PUBLIC_ID]
    );
    for (const column of TE_COLUMNS) {
      expect({ column, value: proposal[column] }).toEqual({
        column,
        value: null
      });
    }
    // Not nullable — it defaults to 0, which is "no stall", not "unknown".
    expect(Number(proposal.te_tally_stalled)).toBe(0);
  });

  describe('the tally scheduler', () => {
    // A private proposal that satisfies every other condition the scheduler
    // checks: closed, not final, key present, not stalled. The only thing
    // separating it from the public one is `privacy`.
    beforeAll(async () => {
      await db.queryAsync('INSERT INTO proposals SET ?', {
        id: PRIVATE_ID,
        ipfs: 'bafkreid14private',
        author: '0x0000000000000000000000000000000000000001',
        created: 1,
        space: 'test.eth',
        network: '1',
        symbol: '',
        type: 'weighted',
        strategies: '[]',
        validation: '{}',
        plugins: '{}',
        title: 'private control',
        body: '',
        discussion: '',
        choices: JSON.stringify(['Yes', 'No']),
        start: 1,
        end: 2,
        quorum: 0,
        privacy: 'shutter-elgamal',
        snapshot: 1,
        app: '',
        scores: '[]',
        scores_by_strategy: '[]',
        scores_state: 'pending',
        scores_total: 0,
        scores_updated: 0,
        vp_value_by_strategy: '[]',
        votes: 0,
        te_mpk: Buffer.alloc(96, 1)
      });
    });

    it('picks up the private proposal', async () => {
      const ids = (
        await selectTallyCandidates(Math.floor(Date.now() / 1e3))
      ).map(p => p.id);
      expect(ids).toContain(PRIVATE_ID);
    });

    it('never picks up the public one', async () => {
      const ids = (
        await selectTallyCandidates(Math.floor(Date.now() / 1e3))
      ).map(p => p.id);
      expect(ids).not.toContain(PUBLIC_ID);
    });

    // The previous assertion passes for a boring reason: the public proposal has
    // no `te_mpk`, so `te_mpk IS NOT NULL` excludes it whether or not the privacy
    // gate exists. Verified by deleting the gate — the test stayed green.
    //
    // So force the public proposal to satisfy every *other* condition and assert
    // it is still excluded. Now the only thing keeping it out is `privacy`, which
    // is the property D14 actually claims. A public proposal should never be
    // tallied by the threshold path even if a te_* column somehow got set on it.
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
