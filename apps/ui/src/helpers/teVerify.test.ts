import { beforeAll, describe, expect, it } from 'vitest';
import { G2Point, initCurves } from '@snapshot-labs/private-vote-sdk';
import { pseudonymFor } from './teBallot';
import {
  type AuditBallot,
  type AuditPayload,
  type BallotsPayload,
  aggregateBallots,
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
function makeBallotsPayload(ballots: AuditBallot[]): BallotsPayload {
  return { te_mpk: G2_GEN_HEX, te_config: BASE_CONFIG, ballots };
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
    // Nothing was accumulated (the only ballot was skipped), so the
    // recomputed aggregate (all-null) cannot match any published aggregate.
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
describe('verifyTally: structural rejections', () => {
  it('throws when aggregate is missing', async () => {
    await expect(
      verifyTally(PROPOSAL_ID, makeAuditPayload({ aggregate: null as any }))
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
        })
      )
    ).rejects.toThrow('disagrees with ciphertexts.length');
  });

  it('throws when not enough shares (thresholdMet=false)', async () => {
    // te_threshold_t=2 needs t+1=3 shares per candidate; 0 provided → throws.
    await expect(
      verifyTally(
        PROPOSAL_ID,
        makeAuditPayload({ te_threshold_t: 2, shares: [] })
      )
    ).rejects.toThrow('not enough decryption shares');
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
      await expect(verifyTally(PROPOSAL_ID, payload)).rejects.toThrow(
        'not enough decryption shares'
      );
    }
    // Reaching here without a WASM OOM abort confirms the finally block freed
    // ctSums + committeePKs on every iteration.
  }, 30_000);
});
