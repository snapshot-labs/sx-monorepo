/**
 * The coordinator's election list must not fill up with failed key ceremonies.
 *
 * A private proposal with no key once voting starts can never be tallied. It must
 * drop off the list, or enough of them push new proposals past the limit and those
 * never get a key either.
 */

import fetch from 'node-fetch';
import db from '../../src/helpers/mysql';

const HOST = `http://localhost:${process.env.PORT || 3030}`;
const NOW = Math.floor(Date.now() / 1e3);
const PREFIX = '0xe1e1';
const id = (n: number) => `${PREFIX}${n.toString(16).padStart(60, '0')}`;

const DEAD_COUNT = 501; // one more than the list limit
const WAITING = id(9001); // no key yet, voting starts later
const TALLYING = id(9002); // key set, voting closed, result pending
const FINAL = id(9003); // result published

function row(
  proposalId: string,
  start: number,
  teMpk: Buffer | null,
  scoresState = 'pending'
) {
  return {
    id: proposalId,
    ipfs: `bafkrei${proposalId.slice(-12)}`,
    author: `0x${'e1'.repeat(20)}`,
    created: 1,
    space: 'test.eth',
    network: '1',
    symbol: '',
    type: 'basic',
    strategies: '[]',
    validation: '{}',
    plugins: '{}',
    title: 'election list fixture',
    body: '',
    discussion: '',
    choices: JSON.stringify(['Yes', 'No']),
    start,
    end: start + 600,
    quorum: 0,
    privacy: 'shutter-elgamal',
    snapshot: 1,
    app: '',
    scores: '[]',
    scores_by_strategy: '[]',
    scores_state: scoresState,
    scores_total: 0,
    scores_updated: 0,
    vp_value_by_strategy: '[]',
    votes: 0,
    te_sgp_config: '{}',
    te_mpk: teMpk
  };
}

async function clear() {
  await db.queryAsync('DELETE FROM proposals WHERE id LIKE ?', [`${PREFIX}%`]);
}

describe('GET /api/te_sgp_elections', () => {
  let electionIds: string[];

  beforeAll(async () => {
    await clear();
    const key = Buffer.alloc(96, 1);
    const rows = [
      ...Array.from({ length: DEAD_COUNT }, (_, n) =>
        row(id(n), NOW - 86400 + n, null)
      ),
      row(WAITING, NOW + 3600, null),
      row(TALLYING, NOW - 7200, key),
      row(FINAL, NOW - 7200, key, 'final')
    ];
    const columns = Object.keys(rows[0]);
    await db.queryAsync(
      `INSERT INTO proposals (${columns.join(', ')}) VALUES ?`,
      [rows.map(r => columns.map(c => r[c]))]
    );

    const res = await fetch(`${HOST}/api/te_sgp_elections`);
    electionIds = ((await res.json()) as any).electionIds;
  });

  afterAll(async () => {
    await clear();
    await db.endAsync();
  });

  it('lists a proposal still waiting for its key, despite 501 failed ones', () => {
    expect(electionIds).toContain(WAITING);
    expect(electionIds[0]).toBe(WAITING);
  });

  it('keeps a proposal with a key until its result is final', () => {
    expect(electionIds).toContain(TALLYING);
    expect(electionIds).not.toContain(FINAL);
  });

  it('drops proposals that started without a key', () => {
    expect(
      electionIds.some(
        e => e.startsWith(PREFIX) && Number(`0x${e.slice(6)}`) < DEAD_COUNT
      )
    ).toBe(false);
  });
});
