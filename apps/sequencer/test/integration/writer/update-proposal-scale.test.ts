/**
 * A public -> private edit must adopt the scale of the snapshot it just built.
 *
 * Creation writes `te_config` and `te_geg_config` together, so `scale` and the
 * committee agree. An edit that turns a *public* proposal private has to build the
 * committee snapshot here, because creation took the public path and left
 * `te_geg_config` NULL — and that NULL is exactly the branch condition.
 *
 * So passing `existing.te_geg_config` on to `ballotParamsColumn` handed it the
 * column that is guaranteed empty in this path, and `scale` fell back to 1 while
 * the hub served the keypers the scale derived from the new snapshot
 * (`hub/src/te.ts` recomputes it from `te_geg_config`). The committee then counts
 * in scaled units and `scores.ts` divides by 1, under-reporting every score by the
 * scale factor — enough to fail a quorum on a result that actually met it. The
 * same field drives the pre-signature notice in `Proposal.vue`, so a voter whose
 * power rounds to zero at the real scale is told it counts in full.
 *
 * Only reachable when `budget × V > TE_SOLVER_CEILING`, which for a basic proposal
 * (budget 1) means a supply past the ceiling itself — in practice this is a
 * weighted-proposal bug.
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

const AUTHOR = '0xFC01614d28595d9ea5963daD9f44C0E0F0fE10f0';
const SPACE = 'test.eth';
const ID = `0x${'5c'.repeat(32)}`;

const BUDGET = 100;
const MAX_TOTAL_WEIGHT = 1_000_000;
const SOLVER_CEILING = 1_000_000;
/** deriveScale(100, 1e6, 1e6): doubles until 100 * ceil(1e6/s) <= 1e6. */
const EXPECTED_SCALE = 128;

// Dialling real keypers is not what this pins. Everything else in teCommittee —
// ballotParamsColumn, deriveScale, parseCommitteeSnapshotLoose — stays real,
// because the bug lived in which snapshot reached them.
jest.mock('../../../src/helpers/teCommittee', () => ({
  __esModule: true,
  ...jest.requireActual('../../../src/helpers/teCommittee'),
  buildCommitteeSnapshot: jest.fn(async () => ({
    v: 1,
    eligibilityKey: `0x${'aa'.repeat(48)}`,
    weightedBudget: BUDGET,
    maxTotalWeight: MAX_TOTAL_WEIGHT,
    solverCeiling: SOLVER_CEILING,
    votingStart: 1,
    votingEnd: 2_000_000_000,
    keypers: [],
    thresholdT: 2,
    thresholdN: 3,
    adminAddress: AUTHOR,
    resultPublisherAddress: `0x${'cd'.repeat(20)}`
  }))
}));

jest.mock('../../../src/helpers/teEligibility', () => ({
  __esModule: true,
  getEligibilityKey: jest.fn(async () => `0x${'aa'.repeat(48)}`)
}));

jest.mock('../../../src/helpers/teVotingPowerBound', () => ({
  __esModule: true,
  resolveVotingPowerBound: jest.fn(async () => ({
    value: MAX_TOTAL_WEIGHT,
    source: 'test'
  }))
}));

// The space leaves privacy to the author, so the payload decides.
const getSpaceMock = jest.spyOn(actionHelper, 'getSpace');
getSpaceMock.mockResolvedValue({
  ...spacesGetSpaceFixtures,
  voting: { privacy: 'any' }
});

/** A PUBLIC weighted proposal: no committee, no ballot params. */
async function seed(): Promise<void> {
  await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
  await db.queryAsync('INSERT INTO proposals SET ?', {
    id: ID,
    ipfs: 'bafkreiscalefixture',
    author: AUTHOR,
    created: 1,
    space: SPACE,
    network: '1',
    symbol: '',
    type: 'weighted',
    strategies: '[]',
    validation: '{}',
    plugins: '{}',
    title: 'public to begin with',
    body: '',
    discussion: '',
    choices: JSON.stringify(['A', 'B', 'C']),
    start: Math.floor(Date.now() / 1e3) + 3600,
    end: Math.floor(Date.now() / 1e3) + 7200,
    quorum: 0,
    privacy: '',
    snapshot: 1,
    app: '',
    scores: '[]',
    scores_by_strategy: '[]',
    scores_state: 'pending',
    scores_total: 0,
    scores_updated: 0,
    vp_value_by_strategy: '[]',
    votes: 0,
    te_geg_config: null,
    te_config: null
  });
}

function turnPrivate() {
  return {
    address: AUTHOR,
    msg: JSON.stringify({
      space: SPACE,
      timestamp: String(Math.floor(Date.now() / 1e3)),
      payload: {
        proposal: ID,
        name: 'now private',
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

async function storedRow(): Promise<{ teConfig: any; snapshot: any }> {
  const [row] = await db.queryAsync(
    'SELECT te_config, te_geg_config FROM proposals WHERE id = ?',
    [ID]
  );
  const parse = (v: any) => (typeof v === 'string' ? JSON.parse(v) : v);
  return { teConfig: parse(row.te_config), snapshot: parse(row.te_geg_config) };
}

describe('update-proposal: a public -> private edit adopts the new scale', () => {
  afterAll(async () => {
    await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  beforeEach(seed);

  it('writes the scale derived from the snapshot it just built, not 1', async () => {
    await action(turnPrivate(), 'ipfs2');
    const { teConfig } = await storedRow();
    expect(teConfig.scale).toBe(EXPECTED_SCALE);
  });

  it('agrees with the scale the hub will serve the committee', async () => {
    await action(turnPrivate(), 'ipfs2');
    const { teConfig, snapshot } = await storedRow();
    // What hub/src/te.ts recomputes for the ballot feed.
    const { deriveScale } = jest.requireActual(
      '../../../src/helpers/teCommittee'
    );
    expect(teConfig.scale).toBe(
      deriveScale(
        teConfig.budget,
        snapshot.maxTotalWeight,
        snapshot.solverCeiling
      )
    );
  });

  it('still takes the budget from the same snapshot', async () => {
    await action(turnPrivate(), 'ipfs2');
    const { teConfig, snapshot } = await storedRow();
    expect(teConfig.budget).toBe(BUDGET);
    expect(snapshot.weightedBudget).toBe(BUDGET);
  });
});
