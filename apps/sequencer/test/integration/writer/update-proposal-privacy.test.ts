/**
 * `verify()` and `action()` must agree on whether a proposal is private.
 *
 * They used to derive it separately. In a space whose `voting.privacy` is `'any'`
 * — the default, and what `demo.eth` runs — an update that simply omitted
 * `privacy` was read two different ways: `verify()` fell back to the proposal's
 * current value and applied the `shutter-elgamal` lead-time gate, then `action()`
 * fell back to `''` and wrote the proposal public.
 *
 * Nothing in the response said so. The row kept its `te_geg_config`, `te_mpk` and
 * frozen committee while dropping out of `te_geg_elections`, so a key ceremony
 * already in flight had nothing left to finish it, and every subsequent geg read
 * answered 400. That is finding L-2 — and combined with L-4 (400 where the port
 * contract expects 404) the coordinator gets a `ValueError` it retries forever
 * rather than the `KeyError` that would let it drop the election and move on.
 *
 * `privacy` is optional in the `updateProposal` schema, so omitting it is a client
 * saying nothing about privacy — not asking for public. Going public is spelled
 * `privacy: ''`, which the schema accepts and the UI already sends. Both are
 * pinned below, because a fix that preserved privacy by never honouring `''`
 * would break the flow it is meant to protect.
 */

import * as actionHelper from '../../../src/helpers/actions';
import db, { sequencerDB } from '../../../src/helpers/mysql';
import { action, verify } from '../../../src/writer/update-proposal';
import { spacesGetSpaceFixtures } from '../../fixtures/space';

jest.mock('../../../src/helpers/moderation', () => ({
  __esModule: true,
  ...jest.requireActual('../../../src/helpers/moderation'),
  containsFlaggedLinks: () => false
}));

const AUTHOR = '0xFC01614d28595d9ea5963daD9f44C0E0F0fE10f0';
const SPACE = 'test.eth';
const ID = `0x${'c7'.repeat(32)}`;
const BUDGET = 100;

// The space leaves the choice to the author. This is the only configuration the
// bug lived in: a space that pins its privacy wins outright, so the payload never
// gets consulted and the two derivations cannot disagree.
const getSpaceMock = jest.spyOn(actionHelper, 'getSpace');
getSpaceMock.mockResolvedValue({
  ...spacesGetSpaceFixtures,
  voting: { privacy: 'any' }
});

function committee() {
  return JSON.stringify({
    v: 1,
    eligibilityKey: `0x${'aa'.repeat(48)}`,
    weightedBudget: BUDGET,
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
    ipfs: 'bafkreiprivacyfixture',
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
    // Already through DKG, so the lead-time gate is not what keeps it private —
    // otherwise a fixture could pass by rejecting the edit outright.
    te_mpk: Buffer.alloc(96, 0xab), // VARBINARY(96): the raw G2 point, not hex
    te_geg_config: committee(),
    te_config: JSON.stringify({
      numCandidates: 3,
      budget: BUDGET,
      mode: 'exact',
      variant: 'A'
    })
  });
}

/** An edit payload; pass `privacy: undefined` to omit the key entirely. */
function editBody(privacy?: string) {
  const payload: Record<string, unknown> = {
    proposal: ID,
    name: 'after the edit',
    body: '',
    discussion: '',
    choices: ['A', 'B', 'C'],
    type: 'weighted',
    metadata: {}
  };
  if (privacy !== undefined) payload.privacy = privacy;

  return {
    address: AUTHOR,
    msg: JSON.stringify({
      space: SPACE,
      timestamp: String(Math.floor(Date.now() / 1e3)),
      payload
    })
  };
}

async function stored(): Promise<{ privacy: string; te_geg_config: unknown }> {
  const [row] = await db.queryAsync(
    'SELECT privacy, te_geg_config FROM proposals WHERE id = ?',
    [ID]
  );
  return row;
}

describe('update-proposal: verify() and action() derive privacy identically', () => {
  afterAll(async () => {
    await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  beforeEach(seed);

  // The regression. Before the shared helper this wrote `''`.
  it('keeps a private proposal private when the edit omits privacy', async () => {
    await action(editBody(), 'ipfs2');
    expect((await stored()).privacy).toBe('shutter-elgamal');
  });

  // The harm was never either column alone but the contradiction between them: a
  // row that reads public while still carrying a frozen committee is one the
  // coordinator can no longer see and nothing will ever tally. Asserting the pair
  // is what makes this fail on the bug — the committee column is untouched by the
  // edit either way, so checking it alone proves nothing.
  it('never leaves a committee attached to a proposal that reads public', async () => {
    await action(editBody(), 'ipfs2');
    const row = await stored();
    expect({
      privacy: row.privacy,
      hasCommittee: row.te_geg_config !== null
    }).toEqual({ privacy: 'shutter-elgamal', hasCommittee: true });
  });

  // Both halves of the divergence, asserted against each other rather than
  // against a constant — this fails if either side changes alone.
  it('gates the edit as private in verify(), matching what action() writes', async () => {
    await expect(verify(editBody())).resolves.toBeTruthy();
    await action(editBody(), 'ipfs2');
    expect((await stored()).privacy).toBe('shutter-elgamal');
  });

  // The gate `verify()` exists for, on a proposal that is private only because the
  // row says so. If `verify()` stopped consulting the row it would read this edit
  // as public, skip the gate entirely and resolve — so this is what pins the two
  // halves to the *same* inputs rather than merely to the same helper.
  it('still gates the DKG lead time when privacy is inherited from the row', async () => {
    await db.queryAsync(
      'UPDATE proposals SET te_mpk = NULL, start = ? WHERE id = ?',
      [Math.floor(Date.now() / 1e3) + 60, ID] // inside MIN_DKG_LEAD_TIME_S
    );
    await expect(verify(editBody())).rejects.toMatch(/at least \d+s from now/);
  });

  // Preserving on omission must not make privacy a one-way door.
  it('still honours an explicit request to go public', async () => {
    await action(editBody(''), 'ipfs2');
    expect((await stored()).privacy).toBe('');
  });

  it('still honours an explicit request to stay private', async () => {
    await action(editBody('shutter-elgamal'), 'ipfs2');
    expect((await stored()).privacy).toBe('shutter-elgamal');
  });

  // A public proposal has nothing to preserve, so omission must not invent
  // privacy for it either — the fallback reads the row, it does not default.
  it('leaves a public proposal public when the edit omits privacy', async () => {
    await db.queryAsync(
      'UPDATE proposals SET privacy = ?, te_geg_config = NULL, te_mpk = NULL WHERE id = ?',
      ['', ID]
    );
    await action(editBody(), 'ipfs2');
    expect((await stored()).privacy).toBe('');
  });

  // And the space still wins when it pins the mode, payload notwithstanding.
  it('lets a space that pins its privacy override the payload', async () => {
    getSpaceMock.mockResolvedValueOnce({
      ...spacesGetSpaceFixtures,
      voting: { privacy: 'shutter-elgamal' }
    });
    await action(editBody(''), 'ipfs2');
    expect((await stored()).privacy).toBe('shutter-elgamal');
  });
});
