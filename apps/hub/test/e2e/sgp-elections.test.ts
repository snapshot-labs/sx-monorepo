/**
 * Which proposals are elections.
 *
 * Every SGP route answers 404 for a proposal that is not private, as it does for
 * a missing one. SGP's data-layer client maps 404 to `KeyError` ("no such
 * election") and any other status to `ValueError` (a malformed request).
 *
 * The coordinator's election list must not fill up with failed key ceremonies.
 * A private proposal with no key once voting starts can never be tallied. It must
 * drop off the list, or enough of them push new proposals past the limit and those
 * never get a key either.
 */

import fetch from 'node-fetch';
import db from '../../src/helpers/mysql';
import { HOST, proposalRow } from '../fixtures/sgp';

const NOW = Math.floor(Date.now() / 1e3);
const PREFIX = '0xe1e1';
const id = (n: number) => `${PREFIX}${n.toString(16).padStart(60, '0')}`;

const DEAD_COUNT = 501; // one more than the list limit
const WAITING = id(9001); // no key yet, voting starts later
const TALLYING = id(9002); // key set, voting closed, result pending
const FINAL = id(9003); // result published
// Public, but otherwise listable: only its privacy keeps it off the list.
const PUBLIC = id(9004);

const ROUTES: [method: 'GET' | 'POST', path: string][] = [
  ['GET', 'te_sgp_election'],
  ['GET', 'te_sgp_ballots'],
  ['GET', 'te_sgp_aggregate'],
  ['GET', 'te_sgp_decryption_shares'],
  ['GET', 'te_result'],
  ['GET', 'te_sgp_dkg'],
  ['POST', 'te_sgp_dkg'],
  ['POST', 'te_aggregate'],
  ['POST', 'te_sgp_decryption_share'],
  ['POST', 'te_result'],
  ['POST', 'te_tally_stalled']
];

function row(
  proposalId: string,
  start: number,
  teMpk: Buffer | null,
  overrides: Record<string, any> = {}
) {
  return proposalRow(proposalId, {
    type: 'basic',
    start,
    end: start + 600,
    te_sgp_config: '{}',
    te_mpk: teMpk,
    ...overrides
  });
}

async function clear() {
  await db.queryAsync('DELETE FROM proposals WHERE id LIKE ?', [`${PREFIX}%`]);
}

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
    row(FINAL, NOW - 7200, key, { scores_state: 'final' }),
    row(PUBLIC, NOW + 3600, null, { privacy: '' })
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

describe('GET /api/te_sgp_elections', () => {
  it('lists a proposal still waiting for its key, despite 501 failed ones', () => {
    expect(electionIds).toContain(WAITING);
    expect(electionIds[0]).toBe(WAITING);
  });

  it('keeps a proposal with a key until its result is final', () => {
    expect(electionIds).toContain(TALLYING);
    expect(electionIds).not.toContain(FINAL);
  });

  // A public proposal is never listed as an election; the 404 covers a proposal
  // that changed after it was listed.
  it('does not list a public proposal', () => {
    expect(electionIds).not.toContain(PUBLIC);
  });
});

describe('a non-private proposal is not an election', () => {
  // Each route has its own copy of the check, so each route is tested.
  it.each(ROUTES)('%s %s answers 404', async (method, path) => {
    const res = await fetch(`${HOST}/api/proposal/${PUBLIC}/${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      // An invalid body: the privacy check must answer before body validation.
      ...(method === 'POST' ? { body: JSON.stringify({}) } : {})
    });
    expect(res.status).toBe(404);
  });
});

describe('GET te_sgp_election — ballot parameters', () => {
  // The committee must count with the values the sequencer checked every ballot
  // against, which it keeps in `te_config`.
  const SCALED = id(9101);
  const INCOMPLETE = id(9102);
  const ballot = { numCandidates: 2, budget: 100, mode: 'exact', variant: 'A' };

  beforeAll(async () => {
    for (const [proposalId, teConfig] of [
      [SCALED, { ...ballot, scale: 4 }],
      [INCOMPLETE, ballot]
    ] as const) {
      await db.queryAsync(
        'INSERT INTO proposals SET ?',
        proposalRow(proposalId, { te_config: JSON.stringify(teConfig) })
      );
    }
  });

  it('serves them from te_config', async () => {
    const res = await fetch(`${HOST}/api/proposal/${SCALED}/te_sgp_election`);
    expect(res.status).toBe(200);
    const { config } = (await res.json()) as any;
    expect(config).toMatchObject({ ...ballot, scale: 4 });
  });

  it('refuses an incomplete te_config instead of guessing', async () => {
    const res = await fetch(
      `${HOST}/api/proposal/${INCOMPLETE}/te_sgp_election`
    );
    expect(res.status).toBe(503);
  });
});
