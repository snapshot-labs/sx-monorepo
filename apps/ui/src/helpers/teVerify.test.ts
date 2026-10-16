import { G2Point, initCurves } from '@shutter-network/urban-verified-crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { pseudonymFor } from './teBallot';
import {
  aggregateBallots,
  AuditBallot,
  AuditPayload,
  BallotsPayload,
  diagnoseTally,
  fingerprintHex,
  shortHex,
  verifyTally
} from './teVerify';

const PROPOSAL_ID = `0x${'11'.repeat(32)}`;
const BASE_CONFIG = {
  numCandidates: 3,
  budget: 1,
  mode: 'exact' as const,
  variant: 'A' as const
};

// Set in beforeAll once WASM is ready. Not used in describe-scope literals
// because describe callbacks run at module-evaluation time (before beforeAll).
let G2_GEN_HEX = '';

beforeAll(async () => {
  await initCurves();
  const gen = G2Point.generator();
  G2_GEN_HEX = `0x${Buffer.from(gen.toBytes()).toString('hex')}`;
  gen.destroyWasm();
});

// Factories rather than module-level constants so G2_GEN_HEX is read at call
// time (inside it() callbacks), not at describe-evaluation time.
function makeBallotsPayload(
  ballots: AuditBallot[],
  scale?: number | null
): BallotsPayload {
  return { te_mpk: G2_GEN_HEX, te_config: BASE_CONFIG, scale, ballots };
}

function makeDummyAggregate(numCandidates = BASE_CONFIG.numCandidates) {
  return {
    election_id: PROPOSAL_ID,
    num_candidates: numCandidates,
    ciphertexts: Array.from({ length: numCandidates }, () => ({
      c1: '0x01',
      c2: '0x01'
    }))
  };
}

function makeAuditPayload(overrides: Partial<AuditPayload> = {}): AuditPayload {
  return {
    te_mpk: G2_GEN_HEX,
    te_config: BASE_CONFIG,
    te_committee_pks: [G2_GEN_HEX],
    te_threshold_t: 0,
    te_threshold_n: 1,
    te_keyper_addresses: [`0x${'11'.repeat(20)}`],
    aggregate: {
      election_id: PROPOSAL_ID,
      num_candidates: BASE_CONFIG.numCandidates,
      ciphertexts: Array.from({ length: BASE_CONFIG.numCandidates }, () => ({
        c1: G2_GEN_HEX,
        c2: G2_GEN_HEX
      }))
    },
    shares: [],
    ...overrides
  };
}

function makeBallot(
  index: number,
  vp: number,
  numCandidates = BASE_CONFIG.numCandidates
): AuditBallot {
  const voter = `0x${index.toString(16).padStart(40, '0')}`;
  const pseudonymBytes = pseudonymFor(voter, PROPOSAL_ID);
  const pseudonym = `0x${Buffer.from(pseudonymBytes).toString('hex')}`;
  return {
    voter,
    vp,
    choice: {
      electionId: PROPOSAL_ID,
      pseudonym,
      vk: `0x${'00'.repeat(48)}`,
      ciphertexts: Array.from({ length: numCandidates }, () => ({
        c1: G2_GEN_HEX,
        c2: G2_GEN_HEX
      })),
      zkProof: '0x',
      voterSignature: `0x${'00'.repeat(80)}`
    }
  };
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
describe('fingerprintHex', () => {
  it('returns an 8+8 char keccak snippet', () => {
    const fp = fingerprintHex(['0xdeadbeef', '0xcafe']);
    expect(fp).toMatch(/^[0-9a-f]{8}…[0-9a-f]{8}$/);
  });

  it('is deterministic', () => {
    expect(fingerprintHex(['0xaabb'])).toBe(fingerprintHex(['0xaabb']));
  });

  it('differs for different inputs', () => {
    expect(fingerprintHex(['0xaabb'])).not.toBe(fingerprintHex(['0xccdd']));
  });
});

describe('shortHex', () => {
  it('returns - for null/undefined', () => {
    expect(shortHex(null)).toBe('-');
    expect(shortHex(undefined)).toBe('-');
  });

  it('passes through short strings unchanged', () => {
    expect(shortHex('0x1234')).toBe('0x1234');
  });

  it('truncates long hex with an ellipsis', () => {
    const long = `0x${'ab'.repeat(30)}`;
    const s = shortHex(long);
    expect(s).toContain('…');
    expect(s.length).toBeLessThan(long.length);
    expect(s.startsWith('0x')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// aggregateBallots: structural rejections (no WASM point allocation needed)
//
// aggregateBallots deliberately does not re-run verifyBallot or the
// pseudonym-binding check -- those already ran server-side at cast time
// (apps/sequencer/src/writer/vote.ts's verify()). So there's no "te_config
// missing" or "pseudonym mismatch" failure mode to test here anymore; these
// tests only cover what aggregateBallots itself still does: aggregate and
// compare.
// ---------------------------------------------------------------------------
describe('aggregateBallots: structural rejections', () => {
  it('throws when expectedAggregate is falsy', async () => {
    await expect(
      aggregateBallots(makeBallotsPayload([]), null as any)
    ).rejects.toThrow('No published aggregate');
  });

  it('skips an empty-choice ballot without crashing, but it cannot match', async () => {
    const result = await aggregateBallots(
      makeBallotsPayload([
        { voter: `0x${'11'.repeat(20)}`, vp: 1, choice: null }
      ]),
      makeDummyAggregate()
    );
    expect(result.total).toBe(1);
    expect(result.contributing).toBe(0);
    // Nothing was accumulated, so the recomputed aggregate is the empty sum —
    // the identity. The dummy aggregate is not the identity, so this is a real
    // mismatch rather than an artefact of having accumulated nothing.
    expect(result.aggregateMatches).toBe(false);
  });

  it('skips zero-weight ballots from accumulation', async () => {
    const result = await aggregateBallots(
      makeBallotsPayload([makeBallot(1, 0)]),
      makeDummyAggregate()
    );
    expect(result.total).toBe(1);
    expect(result.aggregateMatches).toBe(false);
  });

  it('counts total across all ballots regardless of skips', async () => {
    const ballots = [
      makeBallot(1, 1),
      { voter: `0x${'ff'.repeat(20)}`, vp: 1, choice: null }, // skipped, still counted
      makeBallot(3, 2)
    ];
    const result = await aggregateBallots(
      makeBallotsPayload(ballots),
      makeDummyAggregate()
    );
    expect(result.total).toBe(3);
  });

  // The regression this guards: an election nobody voted in. The committee
  // publishes the identity in every slot, and the client's sum over zero ballots
  // is that same identity — so it must verify, not report as tampered-with. It
  // read as a mismatch for as long as an empty accumulator was hardcoded to fail,
  // which meant a legitimate zero-turnout result looked like an attack.
  describe('an election with no votes', () => {
    const IDENTITY = `0x${'c0'.padEnd(192, '0')}`;

    function emptyAggregate(numCandidates = BASE_CONFIG.numCandidates) {
      return {
        election_id: PROPOSAL_ID,
        num_candidates: numCandidates,
        ciphertexts: Array.from({ length: numCandidates }, () => ({
          c1: IDENTITY,
          c2: IDENTITY
        }))
      };
    }

    it('verifies an empty aggregate against no ballots', async () => {
      const result = await aggregateBallots(
        makeBallotsPayload([]),
        emptyAggregate()
      );
      expect(result.total).toBe(0);
      expect(result.contributing).toBe(0);
      expect(result.aggregateMatches).toBe(true);
    });

    // The reason the empty case still has to be *compared* rather than waved
    // through: a hub could serve an empty ballot list under an aggregate that no
    // empty list could produce. That is precisely a hub hiding ballots.
    it('rejects a non-empty aggregate when no ballots were served', async () => {
      const result = await aggregateBallots(
        makeBallotsPayload([]),
        makeDummyAggregate()
      );
      expect(result.contributing).toBe(0);
      expect(result.aggregateMatches).toBe(false);
    });

    it('treats an all-dust election as empty, since no ballot carries weight', async () => {
      const result = await aggregateBallots(
        makeBallotsPayload([makeBallot(1, 0), makeBallot(2, 0)]),
        emptyAggregate()
      );
      expect(result.total).toBe(2); // the ballots exist...
      expect(result.contributing).toBe(0); // ...but none of them counted
      expect(result.aggregateMatches).toBe(true);
    });
  });

  // The committee counts a voter above the ceiling *at* the ceiling. If this
  // function does not, it sums a bigger aggregate than the keypers did and reports
  // an honest election as tampered with — the audit tool crying wolf, which is
  // worse than no audit tool. `maxWeight` is served by the hub precisely so the two
  // sides cannot drift.
  describe('the proposal scale', () => {
    // The cap this block used to cover is gone (W1). What replaced it divides every
    // voter by the same amount, so a verifier must apply the identical divisor or it
    // reports an honest committee as having published a false aggregate.

    it('applies the scale, matching the committee', async () => {
      // vp 5 at scale 4 rounds half-up to 1, reproducing the weight-1 aggregate —
      // the generator, which is what a single vp=1 ballot produces.
      const result = await aggregateBallots(
        makeBallotsPayload([makeBallot(1, 5)], 4),
        makeAuditPayload().aggregate
      );
      expect(result.aggregateMatches).toBe(true);
    });

    it('reports ballots that round to zero, and what they held', async () => {
      // Admitted and recorded, but worth nothing — reported so it does not look
      // like a ballot silently went missing.
      const result = await aggregateBallots(
        makeBallotsPayload([makeBallot(1, 1), makeBallot(2, 100)], 100),
        makeAuditPayload().aggregate
      );
      expect(result.scaledToZero).toEqual([
        { voter: expect.any(String), vp: 1 }
      ]);
    });

    it('says nothing when the proposal is unscaled', async () => {
      const result = await aggregateBallots(
        makeBallotsPayload([makeBallot(1, 1)], 1),
        makeAuditPayload().aggregate
      );
      expect(result.scaledToZero).toEqual([]);
      expect(result.aggregateMatches).toBe(true);
    });

    // The regression the served scale exists to prevent.
    it('would mis-report the election as tampered with if the scale were ignored', async () => {
      const unscaled = await aggregateBallots(
        makeBallotsPayload([makeBallot(1, 5)], null),
        makeAuditPayload().aggregate
      );
      expect(unscaled.aggregateMatches).toBe(false);
    });
  });

  it('matches when a single vp=1 ballot equals the published aggregate', async () => {
    // makeBallot's ciphertexts and makeAuditPayload's aggregate ciphertexts
    // both default to the G2 generator, so a lone vp=1 ballot (raw reuse,
    // no scalarMulCt) reproduces the published aggregate exactly.
    const audit = makeAuditPayload();
    const result = await aggregateBallots(
      makeBallotsPayload([makeBallot(1, 1)]),
      audit.aggregate
    );
    expect(result.total).toBe(1);
    expect(result.aggregateMatches).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// aggregateBallots: WASM accumulation path (smoke test + scalarMulCt branch)
//
// 150 voters × 3 candidates exercises both the vp=1 (raw reuse) and vp=2
// (scalarMulCt) branches of the accumulation loop, as well as the addCt
// prev/weighted cleanup. The test proves the code path completes without a
// WASM abort. A full OOM regression (requiring ~7,000+ G2 ops without the
// fix) is covered by the SDK's `npm run bench:wasm` script.
// ---------------------------------------------------------------------------
describe('aggregateBallots: WASM accumulation path', () => {
  const NUM_CANDIDATES = 3;

  it('vp=1 path: accumulates 100 ballots through the raw-reuse branch without WASM abort', async () => {
    const ballots = Array.from({ length: 100 }, (_, i) =>
      makeBallot(i + 1, 1, NUM_CANDIDATES)
    );
    const result = await aggregateBallots(
      { te_mpk: G2_GEN_HEX, te_config: BASE_CONFIG, ballots },
      makeDummyAggregate(NUM_CANDIDATES)
    );
    expect(result.total).toBe(100);
  }, 30_000);

  it('vp=2 path: accumulates 50 ballots through the scalarMulCt branch without WASM abort', async () => {
    const ballots = Array.from({ length: 50 }, (_, i) =>
      makeBallot(i + 200, 2, NUM_CANDIDATES)
    );
    const result = await aggregateBallots(
      { te_mpk: G2_GEN_HEX, te_config: BASE_CONFIG, ballots },
      makeDummyAggregate(NUM_CANDIDATES)
    );
    expect(result.total).toBe(50);
  }, 30_000);
});

// ---------------------------------------------------------------------------
// verifyTally: structural rejections
// ---------------------------------------------------------------------------
// The bound is `budget x Sum(counted weights)`, derived by the caller from the
// ballots. Every case below is rejected on shape before the bound is consulted, so
// 0n is passed to say "irrelevant here" rather than to assert anything about it.
const ANY_BOUND = 0n;

describe('verifyTally: structural rejections', () => {
  it('throws when aggregate is missing', async () => {
    await expect(
      verifyTally(
        PROPOSAL_ID,
        makeAuditPayload({ aggregate: null as any }),
        ANY_BOUND
      )
    ).rejects.toThrow('No encrypted ballots');
  });

  it('throws when num_candidates mismatches ciphertexts length', async () => {
    await expect(
      verifyTally(
        PROPOSAL_ID,
        makeAuditPayload({
          aggregate: {
            election_id: PROPOSAL_ID,
            num_candidates: 5, // says 5 but ciphertexts has 3
            ciphertexts: Array.from(
              { length: BASE_CONFIG.numCandidates },
              () => ({
                c1: G2_GEN_HEX,
                c2: G2_GEN_HEX
              })
            )
          }
        }),
        ANY_BOUND
      )
    ).rejects.toThrow('disagrees with ciphertexts.length');
  });

  it('throws when not enough shares (thresholdMet=false)', async () => {
    // te_threshold_t=2 needs t+1=3 shares per candidate; 0 provided → throws.
    await expect(
      verifyTally(
        PROPOSAL_ID,
        makeAuditPayload({ te_threshold_t: 2, shares: [] }),
        ANY_BOUND
      )
    ).rejects.toThrow('not enough decryption shares');
  });

  it('throws when the committee has published no result to check', async () => {
    // Verification checks published totals rather than re-deriving them, so with
    // nothing published there is nothing to check. Solving it here instead is
    // deliberately not the fallback: that is an escalation someone chooses, on a
    // machine sized for it, not something a browser tab does on page load.
    const payload = makeAuditPayload({ te_threshold_t: 0, shares: [] });
    await expect(verifyTally(PROPOSAL_ID, payload, ANY_BOUND)).rejects.toThrow(
      'has not published a result'
    );
  });
});

// ---------------------------------------------------------------------------
// verifyTally: WASM cleanup on thresholdMet=false
//
// Each call allocates ctSums (3 G2 pairs) + committeePKs (3 G2 points) before
// the thresholdMet throw. Without the try/finally those 9 G2 points per call
// would accumulate. 100 iterations × 9 × 288 B = ~259 KB, small relative to
// the 16 MB heap, but with more PKs (10 × 3 candidates) the leak is larger.
// The test confirms the finally block frees all points so memory is stable.
// ---------------------------------------------------------------------------
describe('verifyTally: WASM heap cleanup on early throw', () => {
  it('frees ctSums and committeePKs after thresholdMet=false across 100 iterations', async () => {
    const NUM_PKS = 10;
    const payload = makeAuditPayload({
      te_committee_pks: Array.from({ length: NUM_PKS }, () => G2_GEN_HEX),
      te_threshold_t: 5, // needs 6 shares; 0 provided → always throws
      te_threshold_n: NUM_PKS,
      shares: []
    });

    for (let i = 0; i < 100; i++) {
      await expect(
        verifyTally(PROPOSAL_ID, payload, ANY_BOUND)
      ).rejects.toThrow('not enough decryption shares');
    }
    // Reaching here without a WASM OOM abort confirms the finally block freed
    // ctSums + committeePKs on every iteration.
  }, 30_000);
});

describe('aggregateBallots: the committee admitted set', () => {
  const generatorAggregate = () => ({
    election_id: PROPOSAL_ID,
    num_candidates: BASE_CONFIG.numCandidates,
    ciphertexts: Array.from({ length: BASE_CONFIG.numCandidates }, () => ({
      c1: G2_GEN_HEX,
      c2: G2_GEN_HEX
    }))
  });

  const seq = (b: AuditBallot, sequenceNumber: number) => ({
    ...b,
    sequenceNumber
  });

  // The regression: one excluded ballot must not read as a failed audit.
  it('sums only the admitted ballots, so an exclusion still matches', async () => {
    const result = await aggregateBallots(
      makeBallotsPayload([
        seq(makeBallot(1, 1), 0), // refused by the committee
        seq(makeBallot(2, 1), 1) // the only one it counted
      ]),
      {
        ...generatorAggregate(),
        admitted: [1],
        exclusions: [{ sequenceNumber: 0, reason: 'INVALID_PROOF' }]
      }
    );
    expect(result.aggregateMatches).toBe(true);
    expect(result.contributing).toBe(1);
    expect(result.total).toBe(2);
  });

  // The same fixture without the admitted set is the old behaviour, and it is
  // what made this a false alarm: two ballots sum to 2G, not G.
  it('would not match if every ballot were summed', async () => {
    const result = await aggregateBallots(
      makeBallotsPayload([seq(makeBallot(1, 1), 0), seq(makeBallot(2, 1), 1)]),
      generatorAggregate()
    );
    expect(result.aggregateMatches).toBe(false);
    expect(result.contributing).toBe(2);
  });

  it('reports the exclusions rather than folding them into the match', async () => {
    const exclusions = [
      { sequenceNumber: 0, reason: 'INVALID_PROOF' },
      { sequenceNumber: 2, reason: 'OUT_OF_WINDOW' }
    ];
    const result = await aggregateBallots(
      makeBallotsPayload([
        seq(makeBallot(1, 1), 0),
        seq(makeBallot(2, 1), 1),
        seq(makeBallot(3, 1), 2)
      ]),
      { ...generatorAggregate(), admitted: [1], exclusions }
    );
    expect(result.aggregateMatches).toBe(true);
    expect(result.exclusions).toEqual(exclusions);
  });

  // An aggregate published before the committee took over carries neither field,
  // and must keep behaving exactly as it did.
  it('falls back to summing everything when admitted is absent', async () => {
    const result = await aggregateBallots(
      makeBallotsPayload([seq(makeBallot(1, 1), 0), seq(makeBallot(2, 1), 1)]),
      makeDummyAggregate()
    );
    expect(result.contributing).toBe(2);
    expect(result.exclusions).toEqual([]);
    expect(result.admittedSetResolved).toBe(true);
  });

  // Two views that disagree about which ballots exist — reported on its own,
  // because it is not a sum that came out differently.
  it('flags an admitted ballot the hub did not serve', async () => {
    const result = await aggregateBallots(
      makeBallotsPayload([seq(makeBallot(1, 1), 0)]),
      { ...generatorAggregate(), admitted: [0, 7], exclusions: [] }
    );
    expect(result.admittedSetResolved).toBe(false);
  });

  it('resolves cleanly when every admitted ballot is present', async () => {
    const result = await aggregateBallots(
      makeBallotsPayload([seq(makeBallot(1, 1), 0)]),
      { ...generatorAggregate(), admitted: [0], exclusions: [] }
    );
    expect(result.admittedSetResolved).toBe(true);
    expect(result.aggregateMatches).toBe(true);
  });

  // A ballot with no sequence number cannot be shown to be one the committee
  // counted, so it must not be summed into a comparison against its aggregate.
  it('ignores a ballot with no sequence number once admitted is in play', async () => {
    const result = await aggregateBallots(
      makeBallotsPayload([makeBallot(1, 1), seq(makeBallot(2, 1), 1)]),
      { ...generatorAggregate(), admitted: [1], exclusions: [] }
    );
    expect(result.contributing).toBe(1);
    expect(result.aggregateMatches).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// diagnoseTally: why there is no verified tally, derived rather than trusted
//
// The keyper-vs-coordinator split decides what an operator does next, so it is
// computed from public share counts instead of read off an unsigned field.
// ---------------------------------------------------------------------------
describe('diagnoseTally', () => {
  const withShares = (perCandidate: number, need: number) =>
    makeAuditPayload({
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

  it('reports awaiting-shares when a candidate is short of the quorum', () => {
    const d = diagnoseTally(withShares(1, 2));
    expect(d.kind).toBe('awaiting-shares');
    if (d.kind === 'awaiting-shares') {
      expect(d.candidatesShort).toBe(BASE_CONFIG.numCandidates);
      expect(d.need).toBe(2);
    }
  });

  it('reports awaiting-coordinator when every share is present but no result is', () => {
    // The distinction that matters: chasing keypers here would be wasted effort.
    expect(diagnoseTally(withShares(2, 2)).kind).toBe('awaiting-coordinator');
  });

  it('reports published once totals exist', () => {
    const payload = withShares(2, 2);
    payload.te_result = {
      totals: ['1', '2', '3'].slice(0, BASE_CONFIG.numCandidates),
      keyper_indices: [1, 2],
      bsgs_bound: '10'
    };
    expect(diagnoseTally(payload).kind).toBe('published');
  });

  it('treats an empty totals array as no result at all', () => {
    // A result row that exists but carries nothing is not something to verify
    // against; it must not read as "published" and then fail cryptically.
    const payload = withShares(2, 2);
    payload.te_result = { totals: [], keyper_indices: [], bsgs_bound: '0' };
    expect(diagnoseTally(payload).kind).toBe('awaiting-coordinator');
  });
});
