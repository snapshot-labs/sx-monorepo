/**
 * Editing a private proposal, or turning a public one private.
 *
 * An edit rewrites `te_config` (ballot params) but keeps the committee snapshot
 * frozen at creation, so the budget and `V` must come from that snapshot, not
 * from the environment. `verify()` and `action()` must also agree on whether the
 * edited proposal is private.
 */

import * as actionHelper from '../../../src/helpers/actions';
import db, { sequencerDB } from '../../../src/helpers/mysql';
import * as committee from '../../../src/helpers/teCommittee';
import * as bound from '../../../src/helpers/teVotingPowerBound';
import { action as createAction } from '../../../src/writer/proposal';
import {
  action as updateAction,
  verify
} from '../../../src/writer/update-proposal';
import { insertProposal } from '../../fixtures/proposal';
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

// Mocked so no keypers are contacted. The snapshot keeps the `V` it is given, and
// the code that derives `scale` from it stays real.
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
const ID = `0x${'c7'.repeat(32)}`;
const BUDGET = 100;
const LEAD_TIME = 180;

const getSpaceMock = jest.spyOn(actionHelper, 'getSpace');
/** Sets the space's `voting` block; `'any'` leaves privacy to the author. */
function useSpace(voting: Record<string, unknown>, extra = {}) {
  getSpaceMock.mockResolvedValue({
    ...spacesGetSpaceFixtures,
    ...extra,
    voting
  });
}

const now = () => Math.floor(Date.now() / 1e3);

/** A committee snapshot as `buildCommitteeSnapshot` stores it, budget frozen in. */
function snapshot(weightedBudget = BUDGET) {
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

/** A private weighted proposal whose key ceremony is done, unless overridden. */
function seed(over: Record<string, unknown> = {}) {
  return insertProposal({
    id: ID,
    type: 'weighted',
    title: 'before the edit',
    choices: JSON.stringify(['A', 'B', 'C']),
    start: now() + 3600,
    end: now() + 7200,
    privacy: 'shutter-elgamal',
    // VARBINARY(96): the raw G2 point, not hex. Present, so the lead-time check
    // does not reject the edit.
    te_mpk: Buffer.alloc(96, 0xab),
    te_sgp_config: snapshot(),
    te_config: JSON.stringify({
      numCandidates: 3,
      budget: BUDGET,
      mode: 'exact',
      variant: 'A'
    }),
    ...over
  });
}

/** A public row: no committee, no key, no ballot params. */
const PUBLIC = {
  privacy: '',
  te_mpk: null,
  te_sgp_config: null,
  te_config: null
};

/** A signed-message envelope for proposal `ID`, with the given payload fields. */
function message(payload: Record<string, unknown>) {
  return {
    address: AUTHOR,
    msg: JSON.stringify({
      space: SPACE,
      timestamp: String(now()),
      payload: {
        proposal: ID,
        body: '',
        discussion: '',
        choices: ['A', 'B', 'C'],
        metadata: {},
        ...payload
      }
    })
  };
}

/** An edit payload; leave `privacy` out to omit the key entirely. */
const editBody = (over: { privacy?: string } = {}) =>
  message({ name: 'after the edit', type: 'weighted', ...over });

async function stored(): Promise<Record<string, any>> {
  const [row] = await db.queryAsync('SELECT * FROM proposals WHERE id = ?', [
    ID
  ]);
  const parse = (v: any) => (typeof v === 'string' ? JSON.parse(v) : v);
  return {
    ...row,
    te_config: parse(row.te_config),
    te_sgp_config: parse(row.te_sgp_config)
  };
}

afterAll(async () => {
  await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
  await db.endAsync();
  await sequencerDB.endAsync();
});

describe('update-proposal: the ballot budget is frozen, not live', () => {
  beforeEach(async () => {
    useSpace({ privacy: 'shutter-elgamal' });
    await seed({ te_mpk: null });
  });

  // `te_config.budget` and `te_sgp_config.weightedBudget` are written together at
  // creation. If the edit read `TE_WEIGHTED_BUDGET` instead, every ballot would
  // fail as `INVALID_PROOF` after the env value changed.
  it('keeps the created budget when the environment has since changed', async () => {
    const original = process.env.TE_WEIGHTED_BUDGET;
    process.env.TE_WEIGHTED_BUDGET = '50'; // operator changed it, sequencer restarted
    try {
      await updateAction(editBody({ privacy: 'shutter-elgamal' }), 'ipfs2');
    } finally {
      if (original === undefined) delete process.env.TE_WEIGHTED_BUDGET;
      else process.env.TE_WEIGHTED_BUDGET = original;
    }
    const row = await stored();
    expect(row.te_config.budget).toBe(BUDGET);
    // The rest of the edit still applies.
    expect(row.title).toBe('after the edit');
  });
});

describe('update-proposal: the DKG lead-time gate', () => {
  // A private proposal needs its key before voting opens. This also stops an
  // author from creating a public proposal that opens in seconds and then making
  // it private.
  beforeEach(() => useSpace({}));

  /** Did this rejection come from the lead-time gate specifically? */
  async function rejectedByLeadTimeGate(): Promise<boolean> {
    try {
      await verify(editBody());
      return false;
    } catch (err: any) {
      return /must start at least/.test(String(err));
    }
  }

  // The edit omits privacy, so it is private only because the row is.
  it.each([
    [
      'refuses a private proposal opening too soon with no key',
      'shutter-elgamal',
      60,
      false,
      true
    ],
    [
      'allows the same edit once the key exists',
      'shutter-elgamal',
      60,
      true,
      false
    ],
    [
      'allows a private proposal opening beyond the lead time',
      'shutter-elgamal',
      LEAD_TIME + 600,
      false,
      false
    ],
    ['never applies to a public proposal', '', 60, false, false]
  ])('%s', async (_label, privacy, opensIn, keyed, rejected) => {
    const start = now() + opensIn;
    await seed({
      ...PUBLIC,
      privacy,
      start,
      end: start + 600,
      te_mpk: keyed ? Buffer.alloc(96, 1) : null
    });
    expect(await rejectedByLeadTimeGate()).toBe(rejected);
  });
});

describe('update-proposal: privacy on edit', () => {
  // Omitting `privacy` means "keep the current value"; `privacy: ''` means "make
  // it public". A private row written as public while keeping its committee would
  // never finish its key ceremony or tally.
  beforeEach(async () => {
    useSpace({ privacy: 'any' });
    await seed();
  });

  it('keeps a private proposal private, with its committee, when the edit omits privacy', async () => {
    await updateAction(editBody(), 'ipfs2');
    const row = await stored();
    expect({
      privacy: row.privacy,
      hasCommittee: row.te_sgp_config !== null
    }).toEqual({ privacy: 'shutter-elgamal', hasCommittee: true });
  });

  // Going public must also clear the committee, key and ballot config.
  it('honours an explicit request to go public and clears the private-voting columns', async () => {
    await updateAction(editBody({ privacy: '' }), 'ipfs2');
    const [row] = await db.queryAsync(
      'SELECT privacy, te_sgp_config, te_mpk, te_config, te_keyper_addresses FROM proposals WHERE id = ?',
      [ID]
    );
    expect(row).toEqual({
      privacy: '',
      te_sgp_config: null,
      te_mpk: null,
      te_config: null,
      te_keyper_addresses: null
    });
  });

  it('lets a space that pins its privacy override the payload', async () => {
    useSpace({ privacy: 'shutter-elgamal' });
    await updateAction(editBody({ privacy: '' }), 'ipfs2');
    expect((await stored()).privacy).toBe('shutter-elgamal');
  });
});

describe('update-proposal: a public -> private edit adopts the new scale', () => {
  // The existing `te_sgp_config` is NULL on a public proposal, so using it would
  // give scale 1 while the hub serves the keypers the real scale.
  beforeEach(async () => {
    useSpace({ privacy: 'any' });
    await seed(PUBLIC);
  });

  it('writes the scale and budget from the snapshot it just built', async () => {
    jest
      .spyOn(bound, 'resolveVotingPowerBound')
      .mockResolvedValueOnce({ value: 1_000_000, source: 'test' } as any);
    jest
      .mocked(committee.buildCommitteeSnapshot)
      .mockImplementationOnce(async (args: any) => ({
        ...JSON.parse(snapshot()),
        maxTotalWeight: args.maxTotalWeight,
        solverCeiling: 1_000_000
      }));

    await updateAction(editBody({ privacy: 'shutter-elgamal' }), 'ipfs2');

    const row = await stored();
    // deriveScale(100, 1e6, 1e6): doubles until 100 * ceil(1e6/s) <= 1e6.
    expect(row.te_config.scale).toBe(128);
    expect(row.te_config.budget).toBe(BUDGET);
    expect(row.te_sgp_config.weightedBudget).toBe(BUDGET);
  });
});

describe('update-proposal: a type edit on a fallback space keeps full precision', () => {
  // `V` is frozen at creation, but `type` can be edited until voting opens. If
  // the fallback `V` were sized for the creation type (budget 1), editing to
  // weighted would force `s = 128` and a voter with power 1 would count as 0.
  beforeEach(async () => {
    // `ticket` has no measurable supply, so `V` takes the fallback.
    useSpace(
      { privacy: 'shutter-elgamal' },
      { strategies: [{ name: 'ticket', params: { symbol: 'T', value: 1 } }] }
    );
    await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
  });

  const create = (type: string) =>
    message({
      name: `private ${type}`,
      type,
      start: now() + 3600,
      end: now() + 7200,
      snapshot: 1,
      privacy: 'shutter-elgamal',
      app: ''
    });

  it('single-choice edited to weighted keeps scale 1', async () => {
    await createAction(create('single-choice'), 'ipfs1', 'receipt', ID);
    expect((await stored()).te_config.scale).toBe(1);

    await updateAction(create('weighted'), 'ipfs2');
    expect((await stored()).te_config.scale).toBe(1);
  });

  // A supply read that fails every retry must give the author a clear error, not
  // an empty 500.
  it('reports a failed supply read plainly instead of a bare error', async () => {
    jest
      .spyOn(bound, 'resolveVotingPowerBound')
      .mockRejectedValueOnce(
        new bound.VotingPowerBoundError('could not read totalSupply')
      );
    await expect(
      createAction(create('single-choice'), 'ipfs1', 'receipt', ID)
    ).rejects.toBe('private voting unavailable: could not read totalSupply');
  });
});
