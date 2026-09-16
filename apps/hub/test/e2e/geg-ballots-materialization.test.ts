/**
 * `te_geg_ballots` — the feed the committee tallies from, against the database.
 *
 * The plan calls this route correctness-critical for one reason: a ballot's
 * admission is expressed *as its sequence number* inside an artifact every keyper
 * must produce byte-identically. If two keypers page the feed differently and
 * disagree about which ballot is number 3, no quorum ever forms — and the failure
 * is silent, because each keyper's own aggregate is internally consistent. So the
 * property under test is not "the route returns ballots", it is:
 *
 *   - the same ballot has the same sequence number regardless of page size;
 *   - reassembling every page reproduces a single full read exactly;
 *   - `total` does not depend on where paging stopped.
 *
 * Written after the route was rewritten to page in SQL rather than reading the
 * whole election and slicing in memory (a ~120 KB envelope per ballot made the
 * old shape read hundreds of megabytes to serve one page, and `countOnly` paid
 * the same cost to return an integer). That rewrite moved sequence numbers from
 * "position in a filtered in-memory list" to `start + i` over a SQL window, which
 * is exactly the kind of change these assertions exist to hold.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Wallet } from '@ethersproject/wallet';
import fetch from 'node-fetch';
import db from '../../src/helpers/mysql';
import {
  ELIGIBILITY_KEY,
  seedEligibilityKey
} from '../fixtures/eligibilityKey';

const HOST = `http://localhost:${process.env.PORT || 3030}`;
const OUTSIDER = new Wallet(`0x${'55'.repeat(32)}`);

const ID = '0xbbbb000000000000000000000000000000000000000000000000000000000001';
const N_BALLOTS = 7;
const NUM_CANDIDATES = 2; // matches `choices`, and the budget below

/**
 * Two ballots deliberately share a `created` second.
 *
 * The order is `(created, id)`; without the `id` tiebreak MySQL may return ties
 * in either order, and two keypers paging at different moments could then
 * disagree about the numbering. A fixture where every timestamp is unique would
 * never exercise that.
 */
const CREATED_AT = [1000, 1001, 1002, 1002, 1003, 1004, 1005];

/**
 * Voter ranks, with the tied pair (indices 2 and 3) deliberately inverted
 * relative to their ids.
 *
 * The `votes` primary key leads with `voter`, so an ordering that lost the `id`
 * tiebreak falls back to an index order that disagrees with `(created, id)`.
 * With ranks ascending, the two orders coincide and a missing tiebreak is
 * invisible — the fixture would pass while the property it exists to protect was
 * broken.
 */
const VOTER_RANK = [1, 2, 9, 4, 5, 6, 7];

function committee() {
  return {
    v: 1,
    // A real committee: `parseCommitteeSnapshot` refuses an empty one, and the
    // route resolves the config before it ever reaches the ballots.
    keypers: [1, 2, 3].map(i => ({
      address: `0x${String(i).repeat(40)}`,
      url: `https://k${i}.example`
    })),
    thresholdT: 2,
    thresholdN: 3,
    eligibilityKey: ELIGIBILITY_KEY,
    resultPublisherAddress: OUTSIDER.address,
    adminAddress: OUTSIDER.address,
    votingStart: 1,
    votingEnd: 2,
    weightedBudget: 100
  };
}

function envelope(i: number) {
  return {
    electionId: ID,
    pseudonym: `0x${String(i).padStart(2, '0').repeat(32)}`,
    vk: `0x${String(i).padStart(2, '0').repeat(48)}`,
    ciphertexts: [
      { c1: `0x${'a1'.repeat(96)}`, c2: `0x${'a2'.repeat(96)}` },
      { c1: `0x${'b1'.repeat(96)}`, c2: `0x${'b2'.repeat(96)}` }
    ],
    zkProof: `0x${'cc'.repeat(64)}`,
    voterSignature: `0x${'dd'.repeat(80)}`,
    wrAttestation: '0x',
    // Inside the envelope, because that is where ingest stores them: `choice` is
    // the artifact the voter's signature covers, and the feed serves the
    // credential from there rather than from a column beside it.
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

async function seed(): Promise<void> {
  // The route refuses to serve a proposal whose frozen eligibility key no longer
  // matches the one in use, so the key the sequencer publishes has to exist and
  // agree with the fixture's committee snapshot. Without it every read is a 503
  // that looks like a routing fault.
  await seedEligibilityKey();
  await db.queryAsync('DELETE FROM votes WHERE proposal = ?', [ID]);
  await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
  await db.queryAsync('INSERT INTO proposals SET ?', {
    id: ID,
    ipfs: 'bafkreiballotsmaterialization',
    author: OUTSIDER.address,
    created: 1,
    space: 'test.eth',
    network: '1',
    symbol: '',
    type: 'weighted',
    strategies: '[]',
    validation: '{}',
    plugins: '{}',
    title: 'ballot materialization',
    body: '',
    discussion: '',
    choices: JSON.stringify(['Yes', 'No']),
    labels: null,
    start: 1,
    end: 2,
    quorum: 0,
    quorum_type: '',
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
    te_geg_config: JSON.stringify(committee())
  });

  for (let i = 0; i < N_BALLOTS; i++) {
    await db.queryAsync('INSERT INTO votes SET ?', {
      id: `0xvote${String(i).padStart(4, '0')}`,
      ipfs: `bafkreivote${i}`,
      voter: `0x${String(VOTER_RANK[i]).padStart(2, '0').repeat(20)}`,
      created: CREATED_AT[i],
      space: 'test.eth',
      proposal: ID,
      choice: JSON.stringify(envelope(i)),
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

type Ballot = {
  ballot: { pseudonym: string; attestation: { weight: number } };
  sequenceNumber: number;
  submittedAt: number;
};

async function read(query = ''): Promise<{ ballots: Ballot[]; total: number }> {
  const res = await fetch(
    `${HOST}/api/proposal/${ID}/te_geg_ballots${query ? `?${query}` : ''}`
  );
  expect(res.status).toBe(200);
  return (await res.json()) as any;
}

/** Page the way geg's `read_all_ballots` does: count, then walk by page size. */
async function readAllPaged(pageSize: number): Promise<Ballot[]> {
  const { count } = (await (
    await fetch(`${HOST}/api/proposal/${ID}/te_geg_ballots?countOnly=1`)
  ).json()) as any;
  const out: Ballot[] = [];
  let start = 0;
  while (start < count) {
    const page = await read(`start=${start}&count=${pageSize}`);
    expect(page.total).toBe(count); // total must not drift between pages
    if (page.ballots.length === 0) throw new Error(`empty page at ${start}`);
    out.push(...page.ballots);
    start += page.ballots.length;
  }
  return out;
}

describe('GET /api/proposal/:id/te_geg_ballots — materialization', () => {
  beforeAll(seed);

  afterAll(async () => {
    await db.queryAsync('DELETE FROM votes WHERE proposal = ?', [ID]);
    await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
  });

  it('numbers ballots contiguously from zero', async () => {
    const { ballots, total } = await read();
    expect(total).toBe(N_BALLOTS);
    expect(ballots.map(b => b.sequenceNumber)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  // The criterion R5 names: two chunk sizes must agree on sequenceNumber → ballot.
  it.each([[1], [2], [3], [5], [N_BALLOTS], [N_BALLOTS + 100]])(
    'reassembles identically at page size %i',
    async pageSize => {
      const full = await read();
      const paged = await readAllPaged(pageSize);
      expect(paged).toEqual(full.ballots);
    }
  );

  /**
   * The `id` tiebreak, asserted structurally — deliberately, and with a caveat.
   *
   * Two ballots can share a `created` second, and `(created)` alone does not
   * order them. Two keypers paging at different moments could then disagree about
   * which ballot is number 3, and no quorum would ever form.
   *
   * This is asserted against the query text rather than through the API because
   * it is not observable there: with the tiebreak removed, MySQL still returns
   * these rows in id order — the fixture even inverts the tied pair's voters to
   * try to provoke a different index order, and it does not. A behavioural test
   * would pass with the property broken, which is worse than no test, so the
   * check that actually fails on removal is the one kept.
   */
  it('orders by (created, id) so tied timestamps cannot reorder', () => {
    const source = readFileSync(join(__dirname, '../../src/geg.ts'), 'utf8');
    const route = source.slice(source.indexOf("te_geg_ballots', async"));
    const orderings = route.match(/ORDER BY created ASC[^`]*/g) ?? [];
    expect(orderings.length).toBeGreaterThan(0);
    for (const o of orderings)
      expect(o).toMatch(/ORDER BY created ASC, id ASC/);
  });

  it('does contain a tied timestamp, so the fixture is not vacuous', () => {
    const tied = CREATED_AT.filter((t, i) => CREATED_AT.indexOf(t) !== i);
    expect(tied.length).toBeGreaterThan(0);
  });

  it('counts without returning ballots, and agrees with a full read', async () => {
    const res = await fetch(
      `${HOST}/api/proposal/${ID}/te_geg_ballots?countOnly=1`
    );
    const body = (await res.json()) as any;
    expect(body).toEqual({ count: N_BALLOTS });
    expect(body.ballots).toBeUndefined();
    expect((await read()).total).toBe(body.count);
  });

  it('serves an empty page past the end without erroring', async () => {
    const page = await read(`start=${N_BALLOTS}&count=10`);
    expect(page.ballots).toEqual([]);
    expect(page.total).toBe(N_BALLOTS);
  });

  // A client asking for more than the cap gets a short page, which its read loop
  // handles by advancing on the length received. Truncating silently is safe
  // only because `total` is still reported.
  it('caps an oversized page rather than refusing it', async () => {
    const page = await read('start=0&count=99999');
    expect(page.ballots.length).toBe(N_BALLOTS); // fewer than the cap here
    expect(page.total).toBe(N_BALLOTS);
  });

  it('emits the stored credential rather than deriving one', async () => {
    const { ballots } = await read();
    // The seeded weight is i+1, deliberately unrelated to `vp`, so a route that
    // went back to recomputing the weight would fail here rather than agree by
    // coincidence.
    expect(ballots.map(b => b.ballot.attestation.weight)).toEqual([
      1, 2, 3, 4, 5, 6, 7
    ]);
  });

  // Soft-deleted votes are excluded from the tally, so they must not consume a
  // sequence number either — the numbering has to close over the gap.
  it('renumbers contiguously when a vote is soft-deleted', async () => {
    await db.queryAsync(
      'UPDATE votes SET cb = -3 WHERE proposal = ? AND id = ?',
      [ID, '0xvote0002']
    );
    try {
      const { ballots, total } = await read();
      expect(total).toBe(N_BALLOTS - 1);
      expect(ballots.map(b => b.sequenceNumber)).toEqual([0, 1, 2, 3, 4, 5]);
      expect(await readAllPaged(2)).toEqual(ballots);
    } finally {
      await db.queryAsync(
        'UPDATE votes SET cb = 0 WHERE proposal = ? AND id = ?',
        [ID, '0xvote0002']
      );
    }
  });

  // A stored ballot with no credential is a hard failure, not a skip: skipping
  // renumbers every ballot after it, so the committee's admitted set would point
  // at the wrong ballots.
  it('refuses the whole read when a ballot has no credential', async () => {
    const stripped = { ...envelope(3) } as any;
    delete stripped.attestation;
    await db.queryAsync(
      'UPDATE votes SET choice = ? WHERE proposal = ? AND id = ?',
      [JSON.stringify(stripped), ID, '0xvote0003']
    );
    try {
      const res = await fetch(`${HOST}/api/proposal/${ID}/te_geg_ballots`);
      expect(res.status).toBe(500);
      expect(JSON.stringify(await res.json())).toMatch(/credential/i);
    } finally {
      await db.queryAsync(
        'UPDATE votes SET choice = ? WHERE proposal = ? AND id = ?',
        [JSON.stringify(envelope(3)), ID, '0xvote0003']
      );
    }
  });
});

/**
 * The page cap, which only exists above it.
 *
 * `MAX_BALLOT_PAGE` bounds a single response so one request cannot pull a whole
 * election — a ~120 KB envelope per ballot made that hundreds of megabytes. The
 * behaviour it guards is invisible in a fixture smaller than the cap, so this one
 * crosses it: 1001 minimal ballots, enough to prove the cap truncates a page while
 * `countOnly` and `total` still report the whole election. Getting that wrong
 * would make a keyper stop paging early and tally a prefix of the ballots.
 */
describe('GET te_geg_ballots — above the page cap', () => {
  const BIG =
    '0xbbbb000000000000000000000000000000000000000000000000000000000002';
  const CAP = 1000;
  const OVER = CAP + 1;

  beforeAll(async () => {
    await db.queryAsync('DELETE FROM votes WHERE proposal = ?', [BIG]);
    await db.queryAsync('DELETE FROM proposals WHERE id = ?', [BIG]);
    await db.queryAsync('INSERT INTO proposals SET ?', {
      id: BIG,
      ipfs: 'bafkreiballotscap',
      author: OUTSIDER.address,
      created: 1,
      space: 'test.eth',
      network: '1',
      symbol: '',
      type: 'weighted',
      strategies: '[]',
      validation: '{}',
      plugins: '{}',
      title: 'page cap',
      body: '',
      discussion: '',
      choices: JSON.stringify(['Yes', 'No']),
      labels: null,
      start: 1,
      end: 2,
      quorum: 0,
      quorum_type: '',
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
      te_geg_config: JSON.stringify(committee())
    });

    // One multi-row insert: 1001 round trips would dominate the suite's runtime.
    const rows = Array.from({ length: OVER }, (_, i) => [
      `0xbig${String(i).padStart(6, '0')}`,
      `bafkreibig${i}`,
      `0x${String(i).padStart(40, '0')}`,
      1000 + i,
      'test.eth',
      BIG,
      JSON.stringify(envelope(i % 7)),
      '{}',
      '',
      '',
      1,
      '[]',
      'final',
      0,
      0
    ]);
    await db.queryAsync(
      `INSERT INTO votes
         (id, ipfs, voter, created, space, proposal, choice, metadata, reason,
          app, vp, vp_by_strategy, vp_state, vp_value, cb)
       VALUES ?`,
      [rows]
    );
  }, 60_000);

  afterAll(async () => {
    await db.queryAsync('DELETE FROM votes WHERE proposal = ?', [BIG]);
    await db.queryAsync('DELETE FROM proposals WHERE id = ?', [BIG]);
  });

  async function big(query = '') {
    const res = await fetch(
      `${HOST}/api/proposal/${BIG}/te_geg_ballots${query ? `?${query}` : ''}`
    );
    expect(res.status).toBe(200);
    return (await res.json()) as any;
  }

  // The one a small fixture cannot catch: a count that silently reports the page
  // size makes a keyper stop after the first page and tally a prefix.
  it('counts the whole election, not one page', async () => {
    expect((await big('countOnly=1')).count).toBe(OVER);
  });

  it('truncates a page at the cap while still reporting the full total', async () => {
    const page = await big('start=0&count=99999');
    expect(page.ballots.length).toBe(CAP);
    expect(page.total).toBe(OVER);
    expect(page.ballots[0].sequenceNumber).toBe(0);
    expect(page.ballots[CAP - 1].sequenceNumber).toBe(CAP - 1);
  });

  it('continues past the cap into a correctly numbered second page', async () => {
    const page = await big(`start=${CAP}&count=99999`);
    expect(page.ballots.length).toBe(OVER - CAP);
    expect(page.ballots[0].sequenceNumber).toBe(CAP);
  });
});

// File-scoped: closing the pool inside a describe's afterAll would shut it before
// the next describe's fixtures could run.
afterAll(async () => {
  await db.endAsync();
});
