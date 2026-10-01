/**
 * An edit must not move the ballot budget out from under the committee.
 *
 * `te_config.budget` (what the browser builds to, and what ingest verifies) and
 * `te_geg_config.weightedBudget` (what the hub advertises to the keypers) are
 * written together at creation from one `TE_WEIGHTED_BUDGET`, so they agree. But
 * the committee snapshot is deliberately never rebuilt for an already-private
 * proposal — re-deriving it could swap the committee mid-ceremony — while an edit
 * rewrites `te_config` in full, down to a typo in the title.
 *
 * So when `ballotParamsColumn` read the environment, changing `TE_WEIGHTED_BUDGET`
 * and restarting moved only one of the pair. Every ballot would then be built and
 * accepted against the new budget and verified by the committee against the old
 * one: rejected as `INVALID_PROOF`, every one of them, and the election publishes a
 * tally of zeros that looks entirely ordinary. That is finding M-2.
 */

import * as actionHelper from '../../../src/helpers/actions';
import db, { sequencerDB } from '../../../src/helpers/mysql';
import { action } from '../../../src/writer/update-proposal';
import { spacesGetSpaceFixtures } from '../../fixtures/space';

jest.mock('../../../src/helpers/moderation', () => ({
  __esModule: true,
  ...jest.requireActual('../../../src/helpers/moderation'),
  containsFlaggedLinks: () => false
}));

const getSpaceMock = jest.spyOn(actionHelper, 'getSpace');
getSpaceMock.mockResolvedValue({
  ...spacesGetSpaceFixtures,
  voting: { privacy: 'shutter-elgamal' }
});

const AUTHOR = '0xFC01614d28595d9ea5963daD9f44C0E0F0fE10f0';
const SPACE = 'test.eth';
const ID = `0x${'be'.repeat(32)}`;
const CREATED_BUDGET = 100;

/** A committee snapshot as `buildCommitteeSnapshot` stores it, budget frozen in. */
function snapshot(weightedBudget: number) {
  return JSON.stringify({
    v: 1,
    eligibilityKey: `0x${'aa'.repeat(48)}`,
    weightedBudget,
    votingStart: 1,
    votingEnd: 2_000_000_000,
    keypers: [],
    thresholdT: 2,
    thresholdN: 3,
    adminAddress: AUTHOR,
    resultPublisherAddress: `0x${'cd'.repeat(20)}`
  });
}

async function seed(): Promise<void> {
  await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
  await db.queryAsync('INSERT INTO proposals SET ?', {
    id: ID,
    ipfs: 'bafkreibudgetfixture',
    author: AUTHOR,
    created: 1,
    space: SPACE,
    network: '1',
    symbol: '',
    type: 'weighted',
    strategies: '[]',
    validation: '{}',
    plugins: '{}',
    title: 'before the edit',
    body: '',
    discussion: '',
    choices: JSON.stringify(['A', 'B', 'C']),
    start: Math.floor(Date.now() / 1e3) + 3600,
    end: Math.floor(Date.now() / 1e3) + 7200,
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
    te_geg_config: snapshot(CREATED_BUDGET),
    te_config: JSON.stringify({
      numCandidates: 3,
      budget: CREATED_BUDGET,
      mode: 'exact',
      variant: 'A'
    })
  });
}

function editBody(title: string) {
  return {
    address: AUTHOR,
    msg: JSON.stringify({
      space: SPACE,
      timestamp: String(Math.floor(Date.now() / 1e3)),
      payload: {
        proposal: ID,
        name: title,
        body: '',
        discussion: '',
        choices: ['A', 'B', 'C'],
        type: 'weighted',
        privacy: 'shutter-elgamal',
        metadata: {}
      }
    })
  };
}

async function storedBudget(): Promise<number> {
  const [row] = await db.queryAsync(
    'SELECT te_config FROM proposals WHERE id = ?',
    [ID]
  );
  const cfg =
    typeof row.te_config === 'string'
      ? JSON.parse(row.te_config)
      : row.te_config;
  return cfg.budget;
}

describe('update-proposal: the ballot budget is frozen, not live', () => {
  const original = process.env.TE_WEIGHTED_BUDGET;

  afterAll(async () => {
    if (original === undefined) delete process.env.TE_WEIGHTED_BUDGET;
    else process.env.TE_WEIGHTED_BUDGET = original;
    await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  beforeEach(seed);

  it('keeps the created budget when the environment has since changed', async () => {
    process.env.TE_WEIGHTED_BUDGET = '50'; // operator changed it, sequencer restarted
    await action(editBody('after the edit'), 'ipfs2');
    expect(await storedBudget()).toBe(CREATED_BUDGET);
  });

  it('keeps it even when the environment is unset entirely', async () => {
    delete process.env.TE_WEIGHTED_BUDGET;
    await action(editBody('after the edit'), 'ipfs2');
    expect(await storedBudget()).toBe(CREATED_BUDGET);
  });

  // The edit itself must still work — the budget is pinned, not the proposal.
  it('still applies the rest of the edit', async () => {
    process.env.TE_WEIGHTED_BUDGET = '50';
    await action(editBody('after the edit'), 'ipfs2');
    const [row] = await db.queryAsync(
      'SELECT title FROM proposals WHERE id = ?',
      [ID]
    );
    expect(row.title).toBe('after the edit');
  });
});
