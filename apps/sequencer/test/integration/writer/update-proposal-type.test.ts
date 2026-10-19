/**
 * Editing a private proposal's type must not change what a vote counts as.
 *
 * `V` is frozen at creation while `type` stays editable until voting opens. On a
 * space whose strategies cannot be measured, `V` is the fallback, and a fallback
 * sized for the creation type (budget 1 for single choice) forced `s = 128` once
 * the proposal was edited to weighted — so every voter with power 1 counted as 0.
 */

import * as actionHelper from '../../../src/helpers/actions';
import db, { sequencerDB } from '../../../src/helpers/mysql';
import { action as createAction } from '../../../src/writer/proposal';
import { action as updateAction } from '../../../src/writer/update-proposal';
import { spacesGetSpaceFixtures } from '../../fixtures/space';

jest.mock('../../../src/helpers/moderation', () => ({
  __esModule: true,
  ...jest.requireActual('../../../src/helpers/moderation'),
  containsFlaggedLinks: () => false
}));

jest.mock('../../../src/helpers/teEligibility', () => ({
  __esModule: true,
  getEligibilityKey: jest.fn(async () => `0x${'aa'.repeat(48)}`)
}));

// Dialling keypers is not what this pins. The snapshot keeps the `V` it is given,
// and everything that derives `scale` from it stays real.
jest.mock('../../../src/helpers/teCommittee', () => ({
  __esModule: true,
  ...jest.requireActual('../../../src/helpers/teCommittee'),
  buildCommitteeSnapshot: jest.fn(async (args: any) => ({
    v: 1,
    keypers: [],
    thresholdT: 2,
    thresholdN: 3,
    eligibilityKey: args.eligibilityKey,
    resultPublisherAddress: `0x${'cd'.repeat(20)}`,
    adminAddress: args.adminAddress,
    votingStart: args.votingStart,
    votingEnd: args.votingEnd,
    weightedBudget: 100,
    maxTotalWeight: args.maxTotalWeight,
    solverCeiling: 1e12
  }))
}));

const AUTHOR = '0xFC01614d28595d9ea5963daD9f44C0E0F0fE10f0';
const SPACE = 'test.eth';
const ID = `0x${'7e'.repeat(32)}`;

// `ticket` has no measurable supply, so `V` takes the fallback.
jest.spyOn(actionHelper, 'getSpace').mockResolvedValue({
  ...spacesGetSpaceFixtures,
  strategies: [{ name: 'ticket', params: { symbol: 'T', value: 1 } }],
  voting: { privacy: 'shutter-elgamal' }
});

function message(type: string) {
  const now = Math.floor(Date.now() / 1e3);
  return {
    address: AUTHOR,
    msg: JSON.stringify({
      space: SPACE,
      timestamp: String(now),
      payload: {
        proposal: ID,
        name: `private ${type}`,
        body: '',
        discussion: '',
        choices: ['A', 'B', 'C'],
        type,
        start: now + 3600,
        end: now + 7200,
        snapshot: 1,
        privacy: 'shutter-elgamal',
        metadata: {},
        app: ''
      }
    })
  };
}

async function storedScale(): Promise<number> {
  const [row] = await db.queryAsync(
    'SELECT te_config FROM proposals WHERE id = ?',
    [ID]
  );
  return JSON.parse(row.te_config).scale;
}

describe('update-proposal: a type edit on a fallback space keeps full precision', () => {
  beforeEach(async () => {
    await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
  });

  afterAll(async () => {
    await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  it.each([
    ['single-choice', 'weighted'],
    ['weighted', 'basic']
  ])('%s edited to %s keeps scale 1', async (from, to) => {
    await createAction(message(from), 'ipfs1', 'receipt', ID);
    expect(await storedScale()).toBe(1);

    await updateAction(message(to), 'ipfs2');
    expect(await storedScale()).toBe(1);
  });
});
