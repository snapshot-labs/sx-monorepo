/**
 * A proposal that is not private is not an election, and must say so as 404.
 *
 * The distinction is not cosmetic. geg's data-layer client maps 404 onto
 * `KeyError` — "no such election" — and every other status onto `ValueError`,
 * which means "your request was malformed". A caller told its request was
 * malformed has no reason to stop sending it, and no way to tell a public
 * proposal apart from a genuine protocol error. Plan §4.2 specifies 404 for
 * *"unknown proposal; not `shutter-elgamal`"*; the guard answered 400 on all
 * eleven routes. That is finding L-4.
 *
 * The proposal existing in Snapshot is not the question. This API serves
 * elections, only a private proposal is one, and so the resource really is
 * absent — the same answer a deleted proposal gets, distinguished by message
 * rather than by status.
 *
 * Every route is covered rather than a sample, because the guard is copied
 * eleven times: a per-route test is the only thing that catches the twelfth copy
 * being written with the old status.
 */

import fetch from 'node-fetch';
import db from '../../src/helpers/mysql';

const HOST = `http://localhost:${process.env.PORT || 3030}`;
const ID = '0xdddd000000000000000000000000000000000000000000000000000000000001';

const ROUTES: [method: 'GET' | 'POST', path: string][] = [
  ['GET', 'te_geg_election'],
  ['GET', 'te_geg_ballots'],
  ['GET', 'te_geg_aggregate'],
  ['GET', 'te_geg_decryption_shares'],
  ['GET', 'te_result'],
  ['GET', 'te_geg_dkg'],
  ['POST', 'te_geg_dkg'],
  ['POST', 'te_aggregate'],
  ['POST', 'te_geg_decryption_share'],
  ['POST', 'te_result'],
  ['POST', 'te_tally_stalled']
];

async function call(method: 'GET' | 'POST', path: string) {
  return fetch(`${HOST}/api/proposal/${ID}/${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    // A body the route would reject on its own merits if it ever got that far —
    // the point is that the privacy guard answers first.
    ...(method === 'POST' ? { body: JSON.stringify({}) } : {})
  });
}

describe('a non-private proposal is not an election', () => {
  beforeAll(async () => {
    await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
    await db.queryAsync('INSERT INTO proposals SET ?', {
      id: ID,
      ipfs: 'bafkreipublicfixture',
      author: `0x${'e5'.repeat(20)}`,
      created: 1,
      space: 'test.eth',
      network: '1',
      symbol: '',
      type: 'weighted',
      strategies: '[]',
      validation: '{}',
      plugins: '{}',
      title: 'an ordinary public proposal',
      body: '',
      discussion: '',
      choices: JSON.stringify(['Yes', 'No']),
      start: 1,
      end: 2,
      quorum: 0,
      privacy: '', // public — the whole point
      snapshot: 1,
      app: '',
      scores: '[]',
      scores_by_strategy: '[]',
      scores_state: 'pending',
      scores_total: 0,
      scores_updated: 0,
      vp_value_by_strategy: '[]',
      votes: 0
    });
  });

  afterAll(async () => {
    await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
    await db.endAsync();
  });

  it.each(ROUTES)('%s %s answers 404', async (method, path) => {
    expect((await call(method, path)).status).toBe(404);
  });

  // The status is what the client branches on, but an operator reading a log
  // still has to tell "this proposal is public" from "this proposal is gone".
  it('keeps the two 404s distinguishable by message', async () => {
    const publicProposal = await (await call('GET', 'te_geg_election')).text();
    const missing = await (
      await fetch(`${HOST}/api/proposal/0x${'ff'.repeat(32)}/te_geg_election`)
    ).text();

    expect(publicProposal).toContain('proposal_not_private');
    expect(missing).toContain('proposal_not_found');
  });

  // The list is the other half of the contract: a public proposal must not be
  // offered as an election in the first place, so the 404 is a backstop for a
  // proposal that changed after it was listed, not the primary defence.
  it('does not list it as an election at all', async () => {
    const res = await fetch(`${HOST}/api/te_geg_elections`);
    expect(await res.text()).not.toContain(ID);
  });
});
