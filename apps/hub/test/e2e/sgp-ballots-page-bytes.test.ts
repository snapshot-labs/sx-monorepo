/**
 * `te_sgp_ballots` caps a page by bytes as well as by rows.
 *
 * A real envelope is ~120-160 KB at budget 100 and over 1 MB at the
 * `MAX_PROOF_BRANCHES` ceiling, so a 1000-row page is 150 MB to 1.3 GB. The hub
 * and then te-data-layer each build that in memory, inside te-data-layer's 10 s
 * hub timeout, and a page that misses it fails with 502 on every retry, so the
 * committee can never read the ballots. Pages now stop at ~8 MiB of envelopes.
 *
 * It also covers the sort: the route used to `ORDER BY` the envelopes in MySQL,
 * which refuses to sort a row above `sort_buffer_size` (256 KiB by default), so a
 * page holding one ballot above that (five choices at budget 100) failed with 500.
 *
 * The properties:
 *   - realistic ballots (200 KB) come back in pages of at most ~8 MiB;
 *   - a ballot above 256 KiB is served at all;
 *   - very large ballots come back in several short pages, one above the cap alone;
 *   - sequence numbers stay contiguous across pages, and paging the way SGP's
 *     `read_all_ballots` does (advance by the rows received) reads every ballot
 *     exactly once.
 */

import fetch from 'node-fetch';
import db from '../../src/helpers/mysql';
import {
  ELIGIBILITY_KEY,
  seedEligibilityKey
} from '../fixtures/eligibilityKey';

const HOST = `http://localhost:${process.env.PORT || 3030}`;
const NUM_CANDIDATES = 2;
const KB = 1000;
const MiB = 1024 * 1024;
const CAP = 8 * MiB; // MAX_BALLOT_PAGE_BYTES in src/sgp.ts

/** One proposal per case, each with its own envelope sizes. */
const CASES = {
  // A realistic budget-100 envelope; 50 of them are ~10 MB, over one page.
  realistic: {
    id: '0xbbbd000000000000000000000000000000000000000000000000000000000001',
    sizes: Array.from({ length: 50 }, () => 200 * KB)
  },
  // Above MySQL's default 256 KiB sort buffer.
  aboveSortBuffer: {
    id: '0xbbbd000000000000000000000000000000000000000000000000000000000002',
    sizes: [300 * KB, 300 * KB]
  },
  // Five at 3 MiB (two fit under the cap per page), then one above the cap.
  huge: {
    id: '0xbbbd000000000000000000000000000000000000000000000000000000000003',
    sizes: [3, 3, 3, 3, 3, 9].map(n => n * MiB)
  }
};

function envelope(ID: string, proofBytes: number, i: number) {
  return {
    electionId: ID,
    pseudonym: `0x${String(i).padStart(2, '0').repeat(32)}`,
    vk: `0x${String(i).padStart(2, '0').repeat(48)}`,
    ciphertexts: Array.from({ length: NUM_CANDIDATES }, () => ({
      c1: `0x${'a1'.repeat(96)}`,
      c2: `0x${'a2'.repeat(96)}`
    })),
    // The proof is what makes real envelopes large; padding it here makes the
    // stored row the size the route has to account for.
    zkProof: `0x${'cc'.repeat(proofBytes / 2)}`,
    voterSignature: `0x${'dd'.repeat(80)}`,
    attestation: {
      scheme: 'ATTESTATION_V1',
      electionId: ID,
      pseudonym: `0x${String(i).padStart(2, '0').repeat(32)}`,
      vk: `0x${String(i).padStart(2, '0').repeat(48)}`,
      weight: i + 1,
      nonce: i + 1,
      signature: `0x${String(i).padStart(2, '0').repeat(80)}`
    }
  };
}

async function seed(ID: string, sizes: number[]): Promise<void> {
  await db.queryAsync('DELETE FROM votes WHERE proposal = ?', [ID]);
  await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
  await db.queryAsync('INSERT INTO proposals SET ?', {
    id: ID,
    ipfs: `bafkreipagebytes${ID.slice(-1)}`,
    author: `0x${'e5'.repeat(20)}`,
    created: 1,
    space: 'test.eth',
    network: '1',
    symbol: '',
    type: 'weighted',
    strategies: '[]',
    validation: '{}',
    plugins: '{}',
    title: 'ballot page bytes',
    body: '',
    discussion: '',
    choices: JSON.stringify(['Yes', 'No']),
    start: 1,
    end: 2,
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
    te_config: JSON.stringify({
      numCandidates: NUM_CANDIDATES,
      budget: 100,
      mode: 'exact',
      variant: 'A'
    }),
    te_sgp_config: JSON.stringify({
      v: 1,
      keypers: [1, 2, 3].map(i => ({
        address: `0x${String(i).repeat(40)}`,
        url: `https://k${i}.example`
      })),
      thresholdT: 2,
      thresholdN: 3,
      eligibilityKey: ELIGIBILITY_KEY,
      resultPublisherAddress: `0x${'cd'.repeat(20)}`,
      adminAddress: `0x${'e5'.repeat(20)}`,
      votingStart: 1,
      votingEnd: 2,
      weightedBudget: 100
    })
  });

  for (let i = 0; i < sizes.length; i++) {
    await db.queryAsync('INSERT INTO votes SET ?', {
      id: `0xbytes${ID.slice(-1)}${String(i).padStart(4, '0')}`,
      ipfs: `bafkreibytes${ID.slice(-1)}${i}`,
      voter: `0x${String(i + 10)
        .padStart(2, '0')
        .repeat(20)}`,
      created: 1000 + i,
      space: 'test.eth',
      proposal: ID,
      choice: JSON.stringify(envelope(ID, sizes[i], i)),
      metadata: '{}',
      reason: '',
      app: '',
      vp: i + 1,
      vp_by_strategy: '[]',
      vp_state: 'final',
      vp_value: 0,
      cb: 0
    });
  }
}

type Page = {
  ballots: { ballot: { pseudonym: string }; sequenceNumber: number }[];
  bytes: number;
};

async function page(ID: string, start: number, count = 1000): Promise<Page> {
  const res = await fetch(
    `${HOST}/api/proposal/${ID}/te_sgp_ballots?start=${start}&count=${count}`
  );
  expect(res.status).toBe(200);
  const text = await res.text();
  return { ballots: JSON.parse(text).ballots, bytes: text.length };
}

/** Page the way SGP's `read_all_ballots` does; returns each page's row count. */
async function readAll(ID: string, total: number) {
  const seen: number[] = [];
  const pageRows: number[] = [];
  const pageBytes: number[] = [];
  let start = 0;
  while (start < total) {
    const { ballots, bytes } = await page(ID, start);
    if (ballots.length === 0) throw new Error(`empty page at ${start}`);
    seen.push(...ballots.map(b => b.sequenceNumber));
    pageRows.push(ballots.length);
    pageBytes.push(bytes);
    start += ballots.length;
  }
  return { seen, pageRows, pageBytes };
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('GET /api/proposal/:id/te_sgp_ballots — byte cap', () => {
  beforeAll(async () => {
    await seedEligibilityKey();
    for (const c of Object.values(CASES)) await seed(c.id, c.sizes);
  }, 120_000);

  afterAll(async () => {
    for (const c of Object.values(CASES)) {
      await db.queryAsync('DELETE FROM votes WHERE proposal = ?', [c.id]);
      await db.queryAsync('DELETE FROM proposals WHERE id = ?', [c.id]);
    }
    await db.endAsync();
  });

  it('splits realistic ballots into pages of at most ~8 MiB', async () => {
    const { id, sizes } = CASES.realistic;
    const { seen, pageRows, pageBytes } = await readAll(id, sizes.length);
    expect(seen).toEqual(range(sizes.length));
    expect(pageRows.length).toBeGreaterThan(1);
    for (const b of pageBytes) expect(b).toBeLessThan(CAP + MiB);
  });

  it('serves ballots larger than the MySQL sort buffer', async () => {
    const { id } = CASES.aboveSortBuffer;
    const { ballots } = await page(id, 0);
    expect(ballots.map(b => b.sequenceNumber)).toEqual([0, 1]);
  });

  it('serves an envelope larger than the cap on a page of its own', async () => {
    const { id, sizes } = CASES.huge;
    const last = await page(id, sizes.length - 1);
    expect(last.ballots.map(b => b.sequenceNumber)).toEqual([sizes.length - 1]);
  });

  it('reads every very large ballot exactly once when paging by rows received', async () => {
    const { id, sizes } = CASES.huge;
    const { seen, pageRows } = await readAll(id, sizes.length);
    expect(seen).toEqual(range(sizes.length));
    expect(pageRows).toEqual([2, 2, 1, 1]);
  });
});
