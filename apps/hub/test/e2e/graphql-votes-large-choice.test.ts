/**
 * The `votes` query must serve rows whose `choice` is larger than MySQL's sort
 * buffer, and must not return whole private ballots.
 *
 * A private ballot is stored whole in `choice`; with five or more choices it is
 * above 256 KiB, the default `sort_buffer_size`. Sorting such rows fails with
 * ER_OUT_OF_SORTMEMORY. A vote list only shows the first ciphertext component, so
 * that is all the query returns for a private ballot.
 */

import fetch from 'node-fetch';
import db from '../../src/helpers/mysql';

const HOST = `http://localhost:${process.env.PORT || 3030}`;
const SPACE = 'large-choice.eth';
const VOTER = '0x00000000000000000000000000000000000000a1';
const PROPOSALS = [
  `0x${'a1'.repeat(32)}`,
  `0x${'a2'.repeat(32)}`,
  `0x${'a3'.repeat(32)}`
];

const C1 = `0x${'c1'.repeat(96)}`;
/** A private ballot of about 300 KB, the size of a six-choice weighted one. */
const PRIVATE_CHOICE = JSON.stringify({
  ciphertexts: [{ c1: C1, c2: `0x${'c2'.repeat(96)}` }],
  zkProof: `0x${'ab'.repeat(150_000)}`
});
/** A public vote, newest, whose choice must come back unchanged. */
const CHOICES = [PRIVATE_CHOICE, PRIVATE_CHOICE, JSON.stringify({ '1': 2 })];

async function cleanup() {
  await db.queryAsync('DELETE FROM votes WHERE space = ?', [SPACE]);
}

beforeAll(async () => {
  await cleanup();
  for (const [i, proposal] of PROPOSALS.entries()) {
    await db.queryAsync('INSERT INTO votes SET ?', {
      id: `0x${String(i + 1).repeat(64)}`,
      ipfs: `bafklargechoice${i}`,
      voter: VOTER,
      created: 1_700_000_000 + i,
      space: SPACE,
      proposal,
      choice: CHOICES[i],
      metadata: '{}',
      reason: '',
      app: '',
      vp: 1,
      vp_by_strategy: '[1]',
      vp_state: 'final',
      cb: 0
    });
  }
});

afterAll(async () => {
  await cleanup();
  await db.endAsync();
});

describe('votes query with a choice larger than the sort buffer', () => {
  it("lists a voter's votes, newest first, with private ballots cut to a preview", async () => {
    const res = await fetch(`${HOST}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: `{ votes(where: { space: "${SPACE}", voter: "${VOTER}" }) { id choice } }`
      })
    });
    const body = await res.json();

    expect(body.errors).toBeUndefined();
    expect(body.data.votes.map((v: any) => [v.id, v.choice])).toEqual([
      [`0x${'3'.repeat(64)}`, { '1': 2 }],
      [`0x${'2'.repeat(64)}`, { ciphertexts: [{ c1: C1 }] }],
      [`0x${'1'.repeat(64)}`, { ciphertexts: [{ c1: C1 }] }]
    ]);
  });
});
