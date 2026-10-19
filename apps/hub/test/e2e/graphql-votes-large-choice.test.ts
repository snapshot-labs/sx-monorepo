/**
 * The `votes` query must serve rows whose `choice` is larger than MySQL's sort
 * buffer.
 *
 * A private ballot is stored whole in `choice`, and one with five or more choices
 * passes 256 KiB, the default `sort_buffer_size`. Sorting full rows then failed
 * the whole query with ER_OUT_OF_SORTMEMORY, so the UI could not list such a vote
 * at all, including showing voters their own.
 */

import fetch from 'node-fetch';
import db from '../../src/helpers/mysql';

const HOST = `http://localhost:${process.env.PORT || 3030}`;
const SPACE = 'large-choice.eth';
const VOTER = '0x00000000000000000000000000000000000000a1';
const PROPOSALS = [`0x${'a1'.repeat(32)}`, `0x${'a2'.repeat(32)}`];

/** A choice of about 300 KB, the size of a six-choice private ballot. */
const LARGE_CHOICE = JSON.stringify({ zkProof: `0x${'ab'.repeat(150_000)}` });

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
      choice: LARGE_CHOICE,
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
  it("lists a voter's votes in the space, newest first", async () => {
    const res = await fetch(`${HOST}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: `{ votes(where: { space: "${SPACE}", voter: "${VOTER}" }) { id choice } }`
      })
    });
    const body = await res.json();

    expect(body.errors).toBeUndefined();
    expect(body.data.votes.map((v: any) => v.id)).toEqual([
      `0x${'2'.repeat(64)}`,
      `0x${'1'.repeat(64)}`
    ]);
    expect(JSON.stringify(body.data.votes[0].choice).length).toBeGreaterThan(
      256 * 1024
    );
  });
});
