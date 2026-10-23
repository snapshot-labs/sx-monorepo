import { G2Point, initCurves } from '@shutter-network/urban-verified-crypto';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  aggregateBallots,
  AuditBallot,
  AuditPayload,
  BallotsPayload,
  diagnoseTally,
  fetchBallotsPayload,
  verifyTally
} from './teVerify';

const PROPOSAL_ID = `0x${'11'.repeat(32)}`;
const BASE_CONFIG = {
  numCandidates: 3,
  budget: 1,
  mode: 'exact' as const,
  variant: 'A' as const
};

// Set in beforeAll once WASM is ready, so only read it inside test callbacks.
let G2_GEN_HEX = '';

beforeAll(async () => {
  await initCurves();
  const gen = G2Point.generator();
  G2_GEN_HEX = `0x${Buffer.from(gen.toBytes()).toString('hex')}`;
  gen.destroyWasm();
});

const ciphertexts = (hex: string, n = BASE_CONFIG.numCandidates) =>
  Array.from({ length: n }, () => ({ c1: hex, c2: hex }));

const aggregateOf = (hex: string, n = BASE_CONFIG.numCandidates) => ({
  num_candidates: n,
  ciphertexts: ciphertexts(hex, n)
});

function makeBallotsPayload(
  ballots: AuditBallot[],
  scale?: number | null
): BallotsPayload {
  return { scale, ballots };
}

function makeAuditPayload(overrides: Partial<AuditPayload> = {}): AuditPayload {
  return {
    te_mpk: G2_GEN_HEX,
    te_config: BASE_CONFIG,
    te_committee_pks: [G2_GEN_HEX],
    te_threshold_t: 0,
    te_threshold_n: 1,
    te_keyper_addresses: [`0x${'11'.repeat(20)}`],
    aggregate: aggregateOf(G2_GEN_HEX),
    shares: [],
    ...overrides
  };
}

function makeBallot(
  index: number,
  vp: number,
  numCandidates = BASE_CONFIG.numCandidates
): AuditBallot {
  return {
    voter: `0x${index.toString(16).padStart(40, '0')}`,
    vp,
    choice: { ciphertexts: ciphertexts(G2_GEN_HEX, numCandidates) }
  };
}

// Every case below fails before the bound is used, so any value works.
const ANY_BOUND = 0n;

describe('input guards', () => {
  it.each([
    [
      'aggregateBallots without a published aggregate',
      () => aggregateBallots(makeBallotsPayload([]), null as any),
      'No published aggregate'
    ],
    [
      'verifyTally without an aggregate',
      () =>
        verifyTally(
          PROPOSAL_ID,
          makeAuditPayload({ aggregate: null as any }),
          ANY_BOUND
        ),
      'No encrypted ballots'
    ],
    [
      'verifyTally when num_candidates disagrees with the ciphertexts',
      () =>
        verifyTally(
          PROPOSAL_ID,
          makeAuditPayload({
            // says 5 but ciphertexts has 3
            aggregate: { ...aggregateOf(G2_GEN_HEX), num_candidates: 5 }
          }),
          ANY_BOUND
        ),
      'disagrees with ciphertexts.length'
    ],
    [
      // te_threshold_t=2 needs 2 shares per candidate; none are provided.
      'verifyTally without a quorum of shares',
      () =>
        verifyTally(
          PROPOSAL_ID,
          makeAuditPayload({ te_threshold_t: 2, shares: [] }),
          ANY_BOUND
        ),
      'not enough decryption shares'
    ],
    [
      // The client checks published totals and never solves for them.
      'verifyTally before the committee published a result',
      () =>
        verifyTally(
          PROPOSAL_ID,
          makeAuditPayload({ te_threshold_t: 0, shares: [] }),
          ANY_BOUND
        ),
      'has not published a result'
    ]
  ])('rejects %s', async (_label, run, message) => {
    await expect(run()).rejects.toThrow(message);
  });
});

// aggregateBallots does not re-check ballot proofs (the sequencer does), so
// these tests only cover aggregating and comparing.
describe('aggregateBallots', () => {
  // Both fixtures default to the G2 generator, so a single vp=1 ballot
  // reproduces the published aggregate. Scale 1 means no scaling.
  it.each([undefined, 1])(
    'matches when a single vp=1 ballot equals the published aggregate (scale %s)',
    async scale => {
      const result = await aggregateBallots(
        makeBallotsPayload([makeBallot(1, 1)], scale),
        makeAuditPayload().aggregate
      );
      expect(result.total).toBe(1);
      expect(result.aggregateMatches).toBe(true);
      expect(result.scaledToZero).toEqual([]);
    }
  );

  // With no votes, the committee publishes the identity for every candidate, and
  // the sum of zero ballots is the identity too, so this must match.
  describe('an election with no votes', () => {
    const IDENTITY = `0x${'c0'.padEnd(192, '0')}`;

    it('verifies an empty aggregate against no ballots', async () => {
      const result = await aggregateBallots(
        makeBallotsPayload([]),
        aggregateOf(IDENTITY)
      );
      expect(result.total).toBe(0);
      expect(result.contributing).toBe(0);
      expect(result.aggregateMatches).toBe(true);
    });

    // The empty case must still be compared: a hub could hide ballots by serving
    // an empty list under a non-empty aggregate.
    it('rejects a non-empty aggregate when no ballots were served', async () => {
      const result = await aggregateBallots(
        makeBallotsPayload([]),
        aggregateOf('0x01')
      );
      expect(result.contributing).toBe(0);
      expect(result.aggregateMatches).toBe(false);
    });

    it('treats an all-dust election as empty, since no ballot carries weight', async () => {
      const result = await aggregateBallots(
        makeBallotsPayload([makeBallot(1, 0), makeBallot(2, 0)]),
        aggregateOf(IDENTITY)
      );
      expect(result.total).toBe(2); // the ballots exist...
      expect(result.contributing).toBe(0); // ...but none of them counted
      expect(result.aggregateMatches).toBe(true);
    });
  });

  // The committee divides every weight by the proposal's scale. The client must
  // apply the same scale, or an honest aggregate fails to match.
  describe('the proposal scale', () => {
    // vp 5 at scale 4 rounds half up to 1, giving the generator aggregate that a
    // single vp=1 ballot produces. Ignoring the scale counts it as 5 and would
    // mis-report the election as tampered with.
    it.each([
      [4, true],
      [null, false]
    ])('vp 5 at scale %s matches: %s', async (scale, matches) => {
      const result = await aggregateBallots(
        makeBallotsPayload([makeBallot(1, 5)], scale),
        makeAuditPayload().aggregate
      );
      expect(result.aggregateMatches).toBe(matches);
    });

    it('reports ballots that round to zero, and what they held', async () => {
      // vp 1 at scale 100 rounds to zero and is reported.
      const result = await aggregateBallots(
        makeBallotsPayload([makeBallot(1, 1), makeBallot(2, 100)], 100),
        makeAuditPayload().aggregate
      );
      expect(result.scaledToZero).toEqual([
        { voter: expect.any(String), vp: 1 }
      ]);
    });
  });

  // Ballots are summed in chunks of 256, so 257 ballots take the path that adds
  // one chunk's sum to the next. One candidate keeps the decompression cost low.
  it('adds chunk sums correctly past one chunk', async () => {
    const COUNT = 257;
    const sum = G2Point.generator().mul(BigInt(COUNT));
    const hex = `0x${Buffer.from(sum.toBytes()).toString('hex')}`;
    sum.destroyWasm();

    const result = await aggregateBallots(
      makeBallotsPayload(
        Array.from({ length: COUNT }, (_, i) => makeBallot(i + 1, 1, 1))
      ),
      aggregateOf(hex, 1)
    );
    expect(result.contributing).toBe(COUNT);
    expect(result.aggregateMatches).toBe(true);
  }, 30_000);
});

describe('aggregateBallots: the committee admitted set', () => {
  const generatorAggregate = () => aggregateOf(G2_GEN_HEX);

  const seq = (b: AuditBallot, sequenceNumber: number) => ({
    ...b,
    sequenceNumber
  });

  // An excluded ballot must not make the check fail, and the exclusions are
  // reported rather than folded into the match.
  it('sums only the admitted ballots and reports the exclusions', async () => {
    const exclusions = [
      { sequenceNumber: 0, reason: 'INVALID_PROOF' },
      { sequenceNumber: 2, reason: 'OUT_OF_WINDOW' }
    ];
    const result = await aggregateBallots(
      makeBallotsPayload([
        seq(makeBallot(1, 1), 0), // refused by the committee
        seq(makeBallot(2, 1), 1), // the only one it counted
        seq(makeBallot(3, 1), 2) // refused by the committee
      ]),
      { ...generatorAggregate(), admitted: [1], exclusions }
    );
    expect(result.aggregateMatches).toBe(true);
    expect(result.contributing).toBe(1);
    expect(result.total).toBe(3);
    expect(result.exclusions).toEqual(exclusions);
    expect(result.admittedSetResolved).toBe(true);
  });

  // An aggregate without `admitted` or `exclusions` (older data) sums every
  // ballot: 2G here, not G, so it does not match.
  it('sums every ballot when admitted is absent', async () => {
    const result = await aggregateBallots(
      makeBallotsPayload([seq(makeBallot(1, 1), 0), seq(makeBallot(2, 1), 1)]),
      generatorAggregate()
    );
    expect(result.aggregateMatches).toBe(false);
    expect(result.contributing).toBe(2);
    expect(result.exclusions).toEqual([]);
    expect(result.admittedSetResolved).toBe(true);
  });

  // An admitted ballot missing from the hub's list is reported separately from a
  // sum mismatch.
  it('flags an admitted ballot the hub did not serve', async () => {
    const result = await aggregateBallots(
      makeBallotsPayload([seq(makeBallot(1, 1), 0)]),
      { ...generatorAggregate(), admitted: [0, 7], exclusions: [] }
    );
    expect(result.admittedSetResolved).toBe(false);
  });

  // A ballot without a sequence number cannot be matched to `admitted`, so it is
  // skipped.
  it('ignores a ballot with no sequence number once admitted is in play', async () => {
    const result = await aggregateBallots(
      makeBallotsPayload([makeBallot(1, 1), seq(makeBallot(2, 1), 1)]),
      { ...generatorAggregate(), admitted: [1], exclusions: [] }
    );
    expect(result.contributing).toBe(1);
    expect(result.aggregateMatches).toBe(true);
  });
});

// diagnoseTally: uses public share counts to tell who is behind.
describe('diagnoseTally', () => {
  const withShares = (
    perCandidate: number,
    need: number,
    totals?: string[]
  ) => {
    const payload = makeAuditPayload({
      te_threshold_t: need,
      shares: Array.from(
        { length: BASE_CONFIG.numCandidates * perCandidate },
        (_, i) => ({
          keyper_index: (i % perCandidate) + 1,
          candidate: Math.floor(i / perCandidate),
          sigma: G2_GEN_HEX,
          proof_e: `0x${'11'.repeat(32)}`,
          proof_z: `0x${'22'.repeat(32)}`
        })
      )
    });
    if (totals) {
      payload.te_result = {
        totals,
        keyper_indices: totals.length ? [1, 2] : [],
        bsgs_bound: totals.length ? '10' : '0'
      };
    }
    return payload;
  };

  // An empty totals array must not count as "published".
  it.each([
    ['a candidate is short of the quorum', 1, undefined, 'awaiting-shares'],
    [
      'every share is present but no result is',
      2,
      undefined,
      'awaiting-coordinator'
    ],
    ['totals exist', 2, ['1', '2', '3'], 'published'],
    ['the totals array is empty', 2, [], 'awaiting-coordinator']
  ])('when %s, reports it', (_label, perCandidate, totals, kind) => {
    const d = diagnoseTally(withShares(perCandidate, 2, totals));
    expect(d.kind).toBe(kind);
    if (d.kind === 'awaiting-shares') {
      expect(d.candidatesShort).toBe(BASE_CONFIG.numCandidates);
      expect(d.need).toBe(2);
    }
  });
});

// fetchBallotsPayload: reads the committee's paged feed.
describe('fetchBallotsPayload', () => {
  afterEach(() => vi.unstubAllGlobals());

  const entry = (seq: number, weight: number) => ({
    sequenceNumber: seq,
    submittedAt: 1,
    ballot: {
      electionId: PROPOSAL_ID,
      pseudonym: `0x${String(seq).padStart(64, '0')}`,
      vk: '0xvk',
      ciphertexts: [{ c1: '0x01', c2: '0x02' }],
      zkProof: '0xproof',
      voterSignature: '0xsig',
      attestation: { weight, nonce: 1 }
    }
  });

  it('reads every page in order and counts each ballot at its signed weight', async () => {
    const pages: Record<string, any> = {
      0: { ballots: [entry(0, 100), entry(1, 7)], total: 3 },
      2: { ballots: [entry(2, 31)], total: 3 }
    };
    const fetchMock = vi.fn(async (url: string) => {
      const start = new URL(url).searchParams.get('start')!;
      return { ok: true, json: async () => pages[start] } as any;
    });
    vi.stubGlobal('fetch', fetchMock);

    const payload = await fetchBallotsPayload(
      'https://hub.test/api/',
      PROPOSAL_ID,
      4
    );

    expect(fetchMock.mock.calls.map(c => c[0])).toEqual([
      `https://hub.test/api/proposal/${PROPOSAL_ID}/te_sgp_ballots?fields=ciphertexts&start=0`,
      `https://hub.test/api/proposal/${PROPOSAL_ID}/te_sgp_ballots?fields=ciphertexts&start=2`
    ]);
    expect(payload.scale).toBe(4);
    expect(payload.ballots.map(b => [b.sequenceNumber, b.vp])).toEqual([
      [0, 100],
      [1, 7],
      [2, 31]
    ]);
    expect(payload.ballots[2].voter).toBe(entry(2, 31).ballot.pseudonym);
    // Only the ciphertexts are kept; the proof and signatures are dropped.
    expect(payload.ballots[2].choice).toEqual({
      ciphertexts: [{ c1: '0x01', c2: '0x02' }]
    });
  });

  it('stops on an empty page rather than asking forever', async () => {
    const fetchMock = vi.fn(
      async () =>
        ({ ok: true, json: async () => ({ ballots: [], total: 5 }) }) as any
    );
    vi.stubGlobal('fetch', fetchMock);
    const payload = await fetchBallotsPayload(
      'https://hub.test/api',
      PROPOSAL_ID,
      1
    );
    expect(payload.ballots).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
