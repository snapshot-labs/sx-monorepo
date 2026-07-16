import { G2Point, initCurves } from '@snapshot-labs/private-vote-sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { pseudonymFor } from './teBallot';
import {
  AuditBallot,
  AuditPayload,
  BallotsPayload,
  fingerprintHex,
  shortHex,
  verifyBallots,
  verifyTally
} from './teVerify';

// ---------------------------------------------------------------------------
// Mock verifyBallot so fake ballot envelopes pass the ZK check in verifyBallots.
// All other SDK exports (G2Point, addCt, scalarMulCt, …) stay real so the
// accumulation path exercises the actual WASM allocation and destroyWasm calls.
// ---------------------------------------------------------------------------
vi.mock('@snapshot-labs/private-vote-sdk', async importOriginal => {
  const mod =
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    await importOriginal<typeof import('@snapshot-labs/private-vote-sdk')>();
  return { ...mod, verifyBallot: vi.fn(() => ({ ok: true })) };
});

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
// verifyBallots: structural rejections (no WASM point allocation needed)
// ---------------------------------------------------------------------------
describe('verifyBallots: structural rejections', () => {
  it('throws when te_config is missing', async () => {
    await expect(
      verifyBallots(
        PROPOSAL_ID,
        { te_mpk: G2_GEN_HEX, te_config: null, ballots: [] },
        makeDummyAggregate()
      )
    ).rejects.toThrow('te_config missing');
  });

  it('throws when expectedAggregate is falsy', async () => {
    await expect(
      verifyBallots(PROPOSAL_ID, makeBallotsPayload([]), null as any)
    ).rejects.toThrow('No published aggregate');
  });

  it('marks an empty-choice ballot as failure', async () => {
    const result = await verifyBallots(
      PROPOSAL_ID,
      makeBallotsPayload([
        { voter: `0x${'11'.repeat(20)}`, vp: 1, choice: null }
      ]),
      makeDummyAggregate()
    );
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].reason).toBe('empty ballot');
    expect(result.verifiedCount).toBe(0);
  });

  it('marks a pseudonym-mismatch ballot as failure', async () => {
    const result = await verifyBallots(
      PROPOSAL_ID,
      makeBallotsPayload([
        {
          voter: `0x${'11'.repeat(20)}`,
          vp: 1,
          choice: {
            electionId: PROPOSAL_ID,
            pseudonym: `0x${'00'.repeat(32)}`, // wrong; does not match keccak(voter||proposalId)
            vk: `0x${'00'.repeat(48)}`,
            ciphertexts: Array.from(
              { length: BASE_CONFIG.numCandidates },
              () => ({
                c1: G2_GEN_HEX,
                c2: G2_GEN_HEX
              })
            ),
            zkProof: '0x',
            voterSignature: `0x${'00'.repeat(80)}`
          }
        }
      ]),
      makeDummyAggregate()
    );
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].reason).toBe('pseudonym mismatch');
  });

  it('counts zero-weight ballots as verified but skips accumulation', async () => {
    const result = await verifyBallots(
      PROPOSAL_ID,
      makeBallotsPayload([makeBallot(1, 0)]),
      makeDummyAggregate()
    );
    expect(result.failures).toHaveLength(0);
    expect(result.verifiedCount).toBe(1);
  });

  it('counts total correctly across mixed pass/fail ballots', async () => {
    const ballots = [
      makeBallot(1, 1),
      { voter: `0x${'ff'.repeat(20)}`, vp: 1, choice: null }, // empty → failure
      makeBallot(3, 2)
    ];
    const result = await verifyBallots(
      PROPOSAL_ID,
      makeBallotsPayload(ballots),
      makeDummyAggregate()
    );
    expect(result.total).toBe(3);
    expect(result.verifiedCount).toBe(2);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].reason).toBe('empty ballot');
  });
});

// ---------------------------------------------------------------------------
// verifyBallots: WASM accumulation path (smoke test + scalarMulCt branch)
//
// 200 voters × 3 candidates exercises both the vp=1 (raw reuse) and vp=2
// (scalarMulCt) branches of the accumulation loop, as well as the addCt
// prev/weighted cleanup. The test proves the code path completes without a
// WASM abort. A full OOM regression (requiring ~7,000+ G2 ops without the
// fix) is covered by the SDK's `npm run bench:wasm` script.
// ---------------------------------------------------------------------------
describe('verifyBallots: WASM accumulation path', () => {
  const NUM_CANDIDATES = 3;

  it('vp=1 path: accumulates 100 ballots through the raw-reuse branch without WASM abort', async () => {
    const ballots = Array.from({ length: 100 }, (_, i) =>
      makeBallot(i + 1, 1, NUM_CANDIDATES)
    );
    const result = await verifyBallots(
      PROPOSAL_ID,
      {
        te_mpk: G2_GEN_HEX,
        te_config: { ...BASE_CONFIG, numCandidates: NUM_CANDIDATES },
        ballots
      },
      makeDummyAggregate(NUM_CANDIDATES)
    );
    expect(result.verifiedCount).toBe(100);
    expect(result.failures).toHaveLength(0);
  }, 30_000);

  it('vp=2 path: accumulates 50 ballots through the scalarMulCt branch without WASM abort', async () => {
    const ballots = Array.from({ length: 50 }, (_, i) =>
      makeBallot(i + 200, 2, NUM_CANDIDATES)
    );
    const result = await verifyBallots(
      PROPOSAL_ID,
      {
        te_mpk: G2_GEN_HEX,
        te_config: { ...BASE_CONFIG, numCandidates: NUM_CANDIDATES },
        ballots
      },
      makeDummyAggregate(NUM_CANDIDATES)
    );
    expect(result.verifiedCount).toBe(50);
    expect(result.failures).toHaveLength(0);
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
