/**
 * The DKG lead-time gate on edits, and the case it must not block.
 *
 * A private proposal needs its key generated before voting opens; a key that
 * arrives late can never match the ballots, and the proposal is terminally dead at
 * `start`. So both writers refuse a private proposal opening sooner than
 * `MIN_DKG_LEAD_TIME_S`. On the update path that also closes a bypass: an author
 * could otherwise create a public proposal starting in ten seconds and *then* flip
 * it private, skipping the gate in `writer/proposal.ts` entirely.
 *
 * The gate originally fired on every private edit inside the window, including
 * proposals whose ceremony had already finished — locking an author out of fixing a
 * typo on a proposal that was completely ready, and telling them it was "to allow
 * DKG to complete" when the DKG was done. Once `te_mpk` exists the gate is guarding
 * an impossibility, so it now applies only while the key is still outstanding.
 *
 * Note the window is narrow by construction: `verify()` rejects *any* edit once
 * `start` has passed, so this gate only ever applies in the final
 * `MIN_DKG_LEAD_TIME_S` before a proposal opens. That is exactly where the false
 * refusal lived, and why it went unnoticed.
 */

import * as actionHelper from '../../../src/helpers/actions';
import db, { sequencerDB } from '../../../src/helpers/mysql';
import { verify } from '../../../src/writer/update-proposal';
import { spacesGetSpaceFixtures } from '../../fixtures/space';

jest.mock('../../../src/helpers/moderation', () => {
  const originalModule = jest.requireActual('../../../src/helpers/moderation');
  return {
    __esModule: true,
    ...originalModule,
    containsFlaggedLinks: () => false
  };
});

const getSpaceMock = jest.spyOn(actionHelper, 'getSpace');
getSpaceMock.mockResolvedValue({ ...spacesGetSpaceFixtures, voting: {} });

const AUTHOR = '0xFC01614d28595d9ea5963daD9f44C0E0F0fE10f0';
const SPACE = 'test.eth';
const LEAD_TIME = 180;

/** Inside the gate's window: not yet started, but sooner than the lead time. */
const INSIDE_WINDOW = () => Math.floor(Date.now() / 1e3) + 60;
const OUTSIDE_WINDOW = () => Math.floor(Date.now() / 1e3) + LEAD_TIME + 600;

function body(id: string) {
  return {
    address: AUTHOR,
    msg: JSON.stringify({
      space: SPACE,
      payload: {
        proposal: id,
        name: 'edited title',
        body: 'edited body',
        discussion: '',
        choices: ['Yes', 'No'],
        type: 'basic',
        metadata: {}
      }
    })
  };
}

async function seed(
  id: string,
  privacy: string,
  start: number,
  keyed: boolean
): Promise<void> {
  await db.queryAsync('DELETE FROM proposals WHERE id = ?', [id]);
  await db.queryAsync('INSERT INTO proposals SET ?', {
    id,
    ipfs: `bafkrei${id.slice(-12)}`,
    author: AUTHOR,
    created: 1,
    space: SPACE,
    network: '1',
    symbol: '',
    type: 'basic',
    strategies: '[]',
    validation: '{}',
    plugins: '{}',
    title: 'lead time fixture',
    body: '',
    discussion: '',
    choices: JSON.stringify(['Yes', 'No']),
    start,
    end: start + 600,
    quorum: 0,
    privacy,
    snapshot: 1,
    app: '',
    scores: '[]',
    scores_by_strategy: '[]',
    scores_state: 'pending',
    scores_total: 0,
    scores_updated: 0,
    vp_value_by_strategy: '[]',
    votes: 0,
    te_mpk: keyed ? Buffer.alloc(96, 1) : null
  });
}

/** Did this rejection come from the lead-time gate specifically? */
async function rejectedByLeadTimeGate(id: string): Promise<boolean> {
  try {
    await verify(body(id));
    return false;
  } catch (err: any) {
    return /must start at least/.test(String(err));
  }
}

describe('update-proposal: the DKG lead-time gate', () => {
  afterAll(async () => {
    await db.queryAsync('DELETE FROM proposals WHERE space = ?', [SPACE]);
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  it('refuses a private proposal opening too soon with no key yet', async () => {
    const id = '0xlead-private-nokey';
    await seed(id, 'shutter-elgamal', INSIDE_WINDOW(), false);
    expect(await rejectedByLeadTimeGate(id)).toBe(true);
  });

  // The regression this exists for. The ceremony already finished, so the thing the
  // gate protects has happened and refusing the edit protects nothing.
  it('allows the same edit once the key exists', async () => {
    const id = '0xlead-private-keyed';
    await seed(id, 'shutter-elgamal', INSIDE_WINDOW(), true);
    expect(await rejectedByLeadTimeGate(id)).toBe(false);
  });

  it('allows a private proposal that opens well beyond the lead time', async () => {
    const id = '0xlead-private-far';
    await seed(id, 'shutter-elgamal', OUTSIDE_WINDOW(), false);
    expect(await rejectedByLeadTimeGate(id)).toBe(false);
  });

  // D14: a public proposal has no ceremony to wait for.
  it('never applies to a public proposal', async () => {
    const id = '0xlead-public';
    await seed(id, '', INSIDE_WINDOW(), false);
    expect(await rejectedByLeadTimeGate(id)).toBe(false);
  });
});
