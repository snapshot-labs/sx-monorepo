/**
 * Publishing a private tally converts units, and the divisor has to be the one
 * the committee counted in.
 *
 * `te_results.totals_json` is in **scaled units multiplied by the budget**;
 * `proposals.scores` is in token units. The conversion is a single line in
 * `runShutterElgamalTally` — `total * scale / budget` — and it is the only
 * arithmetic this service contributes to a private result. Everything else it
 * merely mirrors.
 *
 * It had no coverage at all: the one suite that imports `scores.ts` mocks
 * `updateProposalAndVotes` outright. So a wrong `scale` published a wrong number
 * with no test failing anywhere, and because the shape of the result is entirely
 * ordinary — right number of candidates, plausible magnitudes, `scores_state`
 * final — nothing downstream looks wrong either. A proposal simply reports a
 * fraction of its real support and can miss a quorum it actually met.
 */

import db, { sequencerDB } from '../../src/helpers/mysql';
import { updateProposalAndVotes } from '../../src/scores';

const AUTHOR = '0xFC01614d28595d9ea5963daD9f44C0E0F0fE10f0';
const SPACE = 'test.eth';

/** A closed private proposal plus the committee's published totals. */
async function seed(args: {
  id: string;
  scale: number | undefined;
  budget: number;
  totals: string[];
  choices?: string[];
}): Promise<void> {
  const { id, scale, budget, totals } = args;
  const choices = args.choices ?? ['For', 'Against', 'Abstain'];
  const now = Math.floor(Date.now() / 1e3);

  await db.queryAsync('DELETE FROM proposals WHERE id = ?', [id]);
  await db.queryAsync('DELETE FROM te_results WHERE proposal_id = ?', [id]);

  // `scale` absent entirely is a real state: every proposal created before the
  // column carried one, and `?? 1` is what reads them.
  const teConfig: Record<string, unknown> = {
    numCandidates: choices.length,
    budget,
    mode: 'exact',
    variant: 'A'
  };
  if (scale !== undefined) teConfig.scale = scale;

  await db.queryAsync('INSERT INTO proposals SET ?', {
    id,
    ipfs: `bafkreiscores${id.slice(2, 10)}`,
    author: AUTHOR,
    created: now - 7200,
    space: SPACE,
    network: '1',
    symbol: '',
    type: 'weighted',
    strategies: '[]',
    validation: '{}',
    plugins: '{}',
    title: 'closed private proposal',
    body: '',
    discussion: '',
    choices: JSON.stringify(choices),
    start: now - 3600,
    end: now - 60, // closed
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
   * The live run of 2026-09-21: V = 1,011,123 TST, ceiling 2e6, budget 100, so
   * scale 64. One voter held 53 VP, which scales to 1 unit and fills the budget
   * for its choice; another held 31, which rounds to zero and moves nothing.
   * The committee returned ["100","0","0"] and the proposal published [64,0,0].
   *
   * With scale read as 1 the same election publishes [1,0,0] — a 64x
   * under-report, and the exact failure the reviewer described.
   */
  it('multiplies the committee total by the scale it counted in', async () => {
    await seed({
      id: IDS.scaled,
      scale: 64,
      budget: 100,
      totals: ['100', '0', '0']
    });
    await updateProposalAndVotes(IDS.scaled);

    const { scores, total, state } = await published(IDS.scaled);
    expect(scores).toEqual([64, 0, 0]);
    expect(total).toBe(64);
    expect(state).toBe('final');
  });

  it('is an identity on an unscaled proposal', async () => {
    await seed({
      id: IDS.unscaled,
      scale: 1,
      budget: 100,
      totals: ['9500', '400', '100']
    });
    await updateProposalAndVotes(IDS.unscaled);

    // scale 1: the budget divisor alone converts back to token units.
    expect((await published(IDS.unscaled)).scores).toEqual([95, 4, 1]);
  });

  it('treats a proposal with no scale as unscaled', async () => {
    await seed({
      id: IDS.missing,
      scale: undefined,
      budget: 100,
      totals: ['9500', '400', '100']
    });
    await updateProposalAndVotes(IDS.missing);

    expect((await published(IDS.missing)).scores).toEqual([95, 4, 1]);
  });

  // A basic proposal has budget 1, so the whole ballot is one unit and the scale
  // is the only conversion left.
  it('applies the scale with no budget divisor on a basic proposal', async () => {
    await seed({
      id: IDS.basic,
      scale: 8,
      budget: 1,
      totals: ['12', '5', '0'],
      choices: ['Yes', 'No', 'Abstain']
    });
    await updateProposalAndVotes(IDS.basic);

    expect((await published(IDS.basic)).scores).toEqual([96, 40, 0]);
  });

  /**
   * No `te_results` row means the committee has not finished, not that the tally
   * is zero. Publishing zeros here would be indistinguishable from a real
   * unanimous abstention, and `scores_state: 'final'` would stop the scheduler
   * ever retrying.
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
