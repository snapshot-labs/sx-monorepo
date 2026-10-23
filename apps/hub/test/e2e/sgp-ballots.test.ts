/**
 * Tests for `te_sgp_ballots`, the ballot feed the committee tallies from.
 *
 * Keypers identify admitted ballots by sequence number, and they must all agree,
 * or no quorum forms. So these tests check that:
 *
 *   - a ballot has the same sequence number at every page size;
 *   - joining all pages gives exactly the same result as one full read;
 *   - `total` is the same on every page, including pages cut by the row or the
 *     byte cap.
 */

import fetch from 'node-fetch';
import db from '../../src/helpers/mysql';
import { cleanup, HOST, insertProposal } from '../fixtures/sgp';

const MiB = 1024 * 1024;

const voteId = (proposal: string, i: number) =>
  `0x${proposal.slice(-4)}${String(i).padStart(6, '0')}`;

/** An envelope whose zkProof has `proofChars` hex characters. */
function envelope(proposal: string, i: number, proofChars = 128) {
  const tag = String(i % 100).padStart(2, '0');
  return {
    electionId: proposal,
    pseudonym: `0x${tag.repeat(32)}`,
    vk: `0x${tag.repeat(48)}`,
    ciphertexts: [
      { c1: `0x${'a1'.repeat(96)}`, c2: `0x${'a2'.repeat(96)}` },
      { c1: `0x${'b1'.repeat(96)}`, c2: `0x${'b2'.repeat(96)}` }
    ],
    // The proof is what makes real envelopes large, so pad it to set the size.
    zkProof: `0x${'c'.repeat(proofChars)}`,
    voterSignature: `0x${'dd'.repeat(80)}`,
    wrAttestation: '0x',
    // Ingest stores the credential inside the envelope (`choice`), and the feed
    // serves it from there.
    attestation: {
      scheme: 'ATTESTATION_V1',
      electionId: proposal,
      pseudonym: `0x${tag.repeat(32)}`,
      vk: `0x${tag.repeat(48)}`,
      weight: i + 1,
      nonce: i + 1,
      signature: `0x${tag.repeat(80)}`
    }
  };
}

function voteRow(
  proposal: string,
  i: number,
  overrides: Record<string, any> = {}
) {
  return {
    id: voteId(proposal, i),
    ipfs: `bafkreivote${proposal.slice(-4)}${i}`,
    voter: `0x${String(i).padStart(40, '0')}`,
    created: 1000 + i,
    space: 'test.eth',
    proposal,
    choice: JSON.stringify(envelope(proposal, i)),
    metadata: '{}',
    reason: '',
    app: '',
    vp: i + 1,
    vp_by_strategy: '[]',
    vp_state: 'final',
    vp_value: 0,
    cb: 0,
    ...overrides
  };
}

async function read(proposal: string, query = ''): Promise<any> {
  const res = await fetch(
    `${HOST}/api/proposal/${proposal}/te_sgp_ballots${query ? `?${query}` : ''}`
  );
  expect(res.status).toBe(200);
  return (await res.json()) as any;
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

// At file level: closing the pool in a describe's afterAll would break the next
// describe.
afterAll(async () => {
  await db.endAsync();
});

describe('GET /api/proposal/:id/te_sgp_ballots — materialization', () => {
  const ID =
    '0xbbbb000000000000000000000000000000000000000000000000000000000001';
  const N_BALLOTS = 7;

  /**
   * Two ballots share a `created` second, so the `id` tiebreak in the
   * `(created, id)` order matters.
   */
  const CREATED_AT = [1000, 1001, 1002, 1002, 1003, 1004, 1005];

  /**
   * Voter ranks. The tied pair (indices 2 and 3) is in the opposite order to their
   * ids, so voter order (the `votes` primary key starts with `voter`) differs from
   * `(created, id)` order.
   */
  const VOTER_RANK = [1, 2, 9, 4, 5, 6, 7];

  /** Page the way SGP's `read_all_ballots` does: count, then walk by page size. */
  async function readAllPaged(pageSize: number): Promise<any[]> {
    const { count } = (await (
      await fetch(`${HOST}/api/proposal/${ID}/te_sgp_ballots?countOnly=1`)
    ).json()) as any;
    const out: any[] = [];
    let start = 0;
    while (start < count) {
      const page = await read(ID, `start=${start}&count=${pageSize}`);
      expect(page.total).toBe(count); // total must not drift between pages
      if (page.ballots.length === 0) throw new Error(`empty page at ${start}`);
      out.push(...page.ballots);
      start += page.ballots.length;
    }
    return out;
  }

  beforeAll(async () => {
    await insertProposal(ID);
    for (let i = 0; i < N_BALLOTS; i++) {
      await db.queryAsync(
        'INSERT INTO votes SET ?',
        voteRow(ID, i, {
          voter: `0x${String(VOTER_RANK[i]).padStart(2, '0').repeat(20)}`,
          created: CREATED_AT[i]
        })
      );
    }
  });

  afterAll(() => cleanup(ID));

  // Page size 3 cuts between the two ballots with the same `created`.
  it.each([[1], [3]])('reassembles identically at page size %i', async size => {
    const full = await read(ID);
    const paged = await readAllPaged(size);
    expect(paged).toEqual(full.ballots);
  });

  it('emits the stored credential rather than deriving one', async () => {
    const { ballots } = await read(ID);
    // The seeded weight (i + 1) is independent of `vp`, so this fails if the route
    // computes the weight itself.
    expect(ballots.map((b: any) => b.ballot.attestation.weight)).toEqual([
      1, 2, 3, 4, 5, 6, 7
    ]);
  });

  // Soft-deleted votes are not tallied, so they get no sequence number.
  it('renumbers contiguously when a vote is soft-deleted', async () => {
    const before = await read(ID);
    expect(before.total).toBe(N_BALLOTS);
    expect(before.ballots.map((b: any) => b.sequenceNumber)).toEqual(
      range(N_BALLOTS)
    );

    await db.queryAsync(
      'UPDATE votes SET cb = -3 WHERE proposal = ? AND id = ?',
      [ID, voteId(ID, 2)]
    );
    try {
      const { ballots, total } = await read(ID);
      expect(total).toBe(N_BALLOTS - 1);
      expect(ballots.map((b: any) => b.sequenceNumber)).toEqual(
        range(N_BALLOTS - 1)
      );
      expect(await readAllPaged(2)).toEqual(ballots);
    } finally {
      await db.queryAsync(
        'UPDATE votes SET cb = 0 WHERE proposal = ? AND id = ?',
        [ID, voteId(ID, 2)]
      );
    }
  });

  // Skipping a ballot would renumber every ballot after it, so the whole read
  // fails instead.
  it('refuses the whole read when a ballot has no credential', async () => {
    const stripped = { ...envelope(ID, 3) } as any;
    delete stripped.attestation;
    await db.queryAsync(
      'UPDATE votes SET choice = ? WHERE proposal = ? AND id = ?',
      [JSON.stringify(stripped), ID, voteId(ID, 3)]
    );
    try {
      const res = await fetch(`${HOST}/api/proposal/${ID}/te_sgp_ballots`);
      expect(res.status).toBe(500);
      expect(JSON.stringify(await res.json())).toMatch(/credential/i);
    } finally {
      await db.queryAsync(
        'UPDATE votes SET choice = ? WHERE proposal = ? AND id = ?',
        [JSON.stringify(envelope(ID, 3)), ID, voteId(ID, 3)]
      );
    }
  });
});

/**
 * `MAX_BALLOT_PAGE` (1000) limits one response, since each envelope is ~120 KB.
 * With 1001 ballots, a page is cut at the cap while `countOnly` and `total` still
 * report all of them; otherwise a keyper would stop early and tally only some.
 */
describe('GET te_sgp_ballots — above the page cap', () => {
  const BIG =
    '0xbbbb000000000000000000000000000000000000000000000000000000000002';
  const CAP = 1000;
  const OVER = CAP + 1;

  beforeAll(async () => {
    await insertProposal(BIG);
    // One multi-row insert, to avoid 1001 round trips.
    const rows = Array.from({ length: OVER }, (_, i) => voteRow(BIG, i));
    const columns = Object.keys(rows[0]);
    await db.queryAsync(`INSERT INTO votes (${columns.join(', ')}) VALUES ?`, [
      rows.map(r => columns.map(c => r[c]))
    ]);
  }, 60_000);

  afterAll(() => cleanup(BIG));

  it('truncates a page at the cap while still reporting the full total', async () => {
    expect((await read(BIG, 'countOnly=1')).count).toBe(OVER);

    const page = await read(BIG, 'start=0&count=99999');
    expect(page.ballots.length).toBe(CAP);
    expect(page.total).toBe(OVER);
    expect(page.ballots[0].sequenceNumber).toBe(0);
    expect(page.ballots[CAP - 1].sequenceNumber).toBe(CAP - 1);

    // The next page continues the numbering.
    const next = await read(BIG, `start=${CAP}&count=99999`);
    expect(next.ballots.length).toBe(OVER - CAP);
    expect(next.ballots[0].sequenceNumber).toBe(CAP);
  });
});

/**
 * A page is also limited by bytes (~8 MiB). An envelope can be up to 1 MB, so a
 * 1000-row page could miss te-data-layer's 10 s hub
 * timeout. MySQL also cannot sort rows above `sort_buffer_size` (256 KiB by
 * default), and these rows are far above it.
 */
describe('GET te_sgp_ballots — byte cap', () => {
  const HUGE =
    '0xbbbd000000000000000000000000000000000000000000000000000000000003';
  // Five at 3 MiB (two fit under the cap per page), then one above the cap.
  const SIZES = [3, 3, 3, 3, 3, 9].map(n => n * MiB);

  beforeAll(async () => {
    await insertProposal(HUGE);
    for (let i = 0; i < SIZES.length; i++) {
      await db.queryAsync(
        'INSERT INTO votes SET ?',
        voteRow(HUGE, i, {
          choice: JSON.stringify(envelope(HUGE, i, SIZES[i]))
        })
      );
    }
  }, 120_000);

  afterAll(() => cleanup(HUGE));

  // Pages as SGP's `read_all_ballots` does: advance by the rows received.
  it('reads every very large ballot exactly once when paging by rows received', async () => {
    const seen: number[] = [];
    const pageRows: number[] = [];
    let start = 0;
    while (start < SIZES.length) {
      const { ballots } = await read(HUGE, `start=${start}&count=1000`);
      if (ballots.length === 0) throw new Error(`empty page at ${start}`);
      seen.push(...ballots.map((b: any) => b.sequenceNumber));
      pageRows.push(ballots.length);
      start += ballots.length;
    }
    expect(seen).toEqual(range(SIZES.length));
    // The last page holds only the envelope above the cap.
    expect(pageRows).toEqual([2, 2, 1, 1]);
  });

  // "Verify tally" needs only the ciphertexts, so it asks for the ballots without
  // their proofs, which are almost all of each ballot.
  it('serves ballots without proofs, all on one page, when asked', async () => {
    const full = await read(HUGE, 'start=0&count=1000');
    const { ballots } = await read(
      HUGE,
      'start=0&count=1000&fields=ciphertexts'
    );
    expect(ballots.map((b: any) => b.sequenceNumber)).toEqual(
      range(SIZES.length)
    );
    expect(ballots.every((b: any) => b.ballot.zkProof === undefined)).toBe(
      true
    );
    expect(ballots[0].ballot.ciphertexts).toEqual(
      full.ballots[0].ballot.ciphertexts
    );
    expect(ballots[0].ballot.attestation).toEqual(
      full.ballots[0].ballot.attestation
    );
  });
});

/**
 * A large ballot is stored off-page, so measuring its size loads all of it. A
 * page of 300 KB ballots holds about 27, so measuring the whole 1000-row window
 * would read every ballot in it to serve those 27.
 */
describe('GET te_sgp_ballots — reads only what it serves', () => {
  const WIDE =
    '0xbbbe000000000000000000000000000000000000000000000000000000000004';
  const N = 200;

  beforeAll(async () => {
    await insertProposal(WIDE);
    for (let i = 0; i < N; i++) {
      await db.queryAsync(
        'INSERT INTO votes SET ?',
        voteRow(WIDE, i, {
          choice: JSON.stringify(envelope(WIDE, i, 300_000))
        })
      );
    }
  }, 120_000);

  afterAll(() => cleanup(WIDE));

  // InnoDB pages read for any reason, cached or not. The counter covers the whole
  // server, so the page is read once first: MySQL's own work after the inserts
  // above (purge, statistics) is then done and not counted.
  async function pagesRead(): Promise<number> {
    const [row] = await db.queryAsync(
      "SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_read_requests'"
    );
    return Number(row.Value);
  }

  it('does not load the ballots of the window it does not serve', async () => {
    await read(WIDE, 'start=0&count=1000');
    const before = await pagesRead();
    const { ballots } = await read(WIDE, 'start=0&count=1000');
    const touched = (await pagesRead()) - before;

    expect(ballots.length).toBeGreaterThan(20);
    expect(ballots.length).toBeLessThan(N);
    // The page itself is about 8 MiB, about 600 pages of 16 KiB. Measuring all
    // 200 ballots would add about 3,800.
    expect(touched).toBeLessThan(2000);
  });
});
