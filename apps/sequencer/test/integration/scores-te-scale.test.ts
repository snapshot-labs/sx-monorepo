/**
 * Publishing a private tally converts the committee's totals to token units.
 *
 * `te_results.totals_json` is in scaled units times the budget; `proposals.scores`
 * is in token units. `runShutterElgamalTally` converts with
 * `total * scale / budget`. A wrong `scale` publishes a plausible but wrong
 * result, so these tests check the conversion directly.
 */

import db, { sequencerDB } from '../../src/helpers/mysql';
import { updateProposalAndVotes } from '../../src/scores';
import { insertProposal } from '../fixtures/proposal';

/** A closed private proposal plus the committee's published totals. */
async function seed(args: {
  id: string;
  scale: number | undefined;
  budget: number;
  totals: string[];
}): Promise<void> {
  const { id, scale, budget, totals } = args;
  const choices = ['For', 'Against', 'Abstain'];
  const now = Math.floor(Date.now() / 1e3);

  await db.queryAsync('DELETE FROM te_results WHERE proposal_id = ?', [id]);

  // Older proposals have no `scale` in `te_config`; it is read as 1.
  const teConfig: Record<string, unknown> = {
    numCandidates: choices.length,
    budget,
    mode: 'exact',
    variant: 'A'
  };
  if (scale !== undefined) teConfig.scale = scale;

  await insertProposal({
    id,
    created: now - 7200,
    type: 'weighted',
    title: 'closed private proposal',
    choices: JSON.stringify(choices),
    start: now - 3600,
    end: now - 60, // closed
    privacy: 'shutter-elgamal',
    te_config: JSON.stringify(teConfig)
  });

  await db.queryAsync('INSERT INTO te_results SET ?', {
    proposal_id: id,
    totals_json: JSON.stringify(totals),
    keyper_indices: JSON.stringify([1, 2]),
    bsgs_bound: 100,
    signature: `0x${'ab'.repeat(65)}`,
    posted_at: now
  });
}

async function published(
  id: string
): Promise<{ scores: number[]; total: number; state: string }> {
  const [row] = await db.queryAsync(
    'SELECT scores, scores_total, scores_state FROM proposals WHERE id = ?',
    [id]
  );
  return {
    scores: JSON.parse(row.scores),
    total: Number(row.scores_total),
    state: row.scores_state
  };
}

const IDS = {
  scaled: `0x${'a1'.repeat(32)}`,
  unscaled: `0x${'a2'.repeat(32)}`,
  missing: `0x${'a3'.repeat(32)}`,
  basic: `0x${'a4'.repeat(32)}`,
  noResult: `0x${'a5'.repeat(32)}`
};

describe('scores: a private tally is published in token units', () => {
  afterAll(async () => {
    for (const id of Object.values(IDS)) {
      await db.queryAsync('DELETE FROM proposals WHERE id = ?', [id]);
      await db.queryAsync('DELETE FROM te_results WHERE proposal_id = ?', [id]);
    }
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  /**
   * Scaled: V = 1,011,123, ceiling 2e6 and budget 100 give scale 64. A voter
   * with 53 VP counts as 1 unit and puts the whole budget on one choice, so the
   * committee returns ["100","0","0"] and the proposal must publish [64,0,0].
   * Reading the scale as 1 would publish [1,0,0].
   * Older proposals have no `scale`, which is read as 1. A basic proposal has
   * budget 1, so only the scale applies.
   */
  it.each([
    [
      'multiplies the total by the scale',
      IDS.scaled,
      64,
      100,
      ['100', '0', '0'],
      [64, 0, 0]
    ],
    [
      'is an identity at scale 1',
      IDS.unscaled,
      1,
      100,
      ['9500', '400', '100'],
      [95, 4, 1]
    ],
    [
      'treats a missing scale as 1',
      IDS.missing,
      undefined,
      100,
      ['9500', '400', '100'],
      [95, 4, 1]
    ],
    [
      'has no budget divisor on a basic proposal',
      IDS.basic,
      8,
      1,
      ['12', '5', '0'],
      [96, 40, 0]
    ]
  ])('%s', async (_label, id, scale, budget, totals, expected) => {
    await seed({ id, scale, budget, totals });
    await updateProposalAndVotes(id);

    const { scores, total, state } = await published(id);
    expect(scores).toEqual(expected);
    expect(total).toBe(expected.reduce((a, b) => a + b, 0));
    expect(state).toBe('final');
  });

  /**
   * No `te_results` row means the committee has not finished, not that the tally
   * is zero. Publishing zeros as `final` would stop the scheduler from retrying.
   */
  it('leaves the proposal pending when the committee has not published', async () => {
    await seed({
      id: IDS.noResult,
      scale: 64,
      budget: 100,
      totals: ['0', '0', '0']
    });
    await db.queryAsync('DELETE FROM te_results WHERE proposal_id = ?', [
      IDS.noResult
    ]);

    await expect(updateProposalAndVotes(IDS.noResult)).resolves.toBe(false);
    const { scores, state } = await published(IDS.noResult);
    expect(state).toBe('pending');
    expect(scores).toEqual([]);
  });
});
