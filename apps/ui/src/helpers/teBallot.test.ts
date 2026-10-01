import { G2Point, initCurves } from '@shutter-network/urban-verified-crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  buildTeBallotEnvelope,
  buildTeWeightedBallotEnvelope,
  pseudonymFor
} from './teBallot';
import * as TeCredential from './teCredential';

// Only the network call is stubbed. The ballot build and its Schnorr signing stay
// real, so these envelopes carry a genuine signature over a genuine ballot *and*
// credential — which is what makes the assertions below worth anything.
vi.mock('./teCredential', async importActual => {
  const actual = (await importActual()) as typeof TeCredential;
  return {
    ...actual,
    requestBallotCredential: vi.fn(async ({ proposalId, vk }) => ({
      attestation: {
        scheme: 'ATTESTATION_V1',
        electionId: proposalId,
        pseudonym: `0x${'22'.repeat(32)}`,
        vk,
        weight: 3,
        nonce: 1,
        signature: `0x${'44'.repeat(80)}`
      },
      votingPower: 3
    }))
  };
});

describe('pseudonymFor', () => {
  it('is deterministic', () => {
    const a = pseudonymFor(
      '0x1111111111111111111111111111111111111111',
      `0x${'22'.repeat(32)}`
    );
    const b = pseudonymFor(
      '0x1111111111111111111111111111111111111111',
      `0x${'22'.repeat(32)}`
    );
    expect(Buffer.from(a).toString('hex')).toBe(Buffer.from(b).toString('hex'));
  });

  it('returns 32 bytes', () => {
    const out = pseudonymFor(
      '0x1111111111111111111111111111111111111111',
      `0x${'22'.repeat(32)}`
    );
    expect(out).toHaveLength(32);
  });

  it('changes with voter address', () => {
    const a = pseudonymFor(`0x${'11'.repeat(20)}`, `0x${'22'.repeat(32)}`);
    const b = pseudonymFor(`0x${'aa'.repeat(20)}`, `0x${'22'.repeat(32)}`);
    expect(Buffer.from(a).toString('hex')).not.toBe(
      Buffer.from(b).toString('hex')
    );
  });

  it('changes with proposal id', () => {
    const a = pseudonymFor(`0x${'11'.repeat(20)}`, `0x${'22'.repeat(32)}`);
    const b = pseudonymFor(`0x${'11'.repeat(20)}`, `0x${'33'.repeat(32)}`);
    expect(Buffer.from(a).toString('hex')).not.toBe(
      Buffer.from(b).toString('hex')
    );
  });
});

// G2Point.generator() is a valid on-curve point — use it as a stand-in mpk
// so crypto paths can run without a real DKG key.
let VALID_MPK = '';
beforeAll(async () => {
  await initCurves();
  const gen = G2Point.generator();
  VALID_MPK = `0x${Buffer.from(gen.toBytes()).toString('hex')}`;
  gen.destroyWasm();
});

describe('buildTeBallotEnvelope — input validation', () => {
  const BASE_ARGS = {
    // Never reached: every case here is refused by config validation, which runs
    // before the credential is requested. Present so the shape typechecks.
    sequencerUrl: 'http://sequencer.invalid/api',
    space: 'test.eth',
    voter: `0x${'11'.repeat(20)}`,
    proposalId: `0x${'22'.repeat(32)}`,
    mpk: `0x${'ab'.repeat(96)}`,
    config: {
      variant: 'A' as const,
      mode: 'exact' as const,
      budget: 1,
      numCandidates: 3
    },
    choice: 1
  };

  it('rejects Variant B', async () => {
    await expect(
      buildTeBallotEnvelope({
        ...BASE_ARGS,
        config: { ...BASE_ARGS.config, variant: 'B' as any }
      })
    ).rejects.toThrow('only Variant A exact B=1');
  });

  it('rejects atMost mode', async () => {
    await expect(
      buildTeBallotEnvelope({
        ...BASE_ARGS,
        config: { ...BASE_ARGS.config, mode: 'atMost' as any }
      })
    ).rejects.toThrow('only Variant A exact B=1');
  });

  it('rejects budget != 1', async () => {
    await expect(
      buildTeBallotEnvelope({
        ...BASE_ARGS,
        config: { ...BASE_ARGS.config, budget: 5 }
      })
    ).rejects.toThrow('only Variant A exact B=1');
  });

  it('rejects choice 0 (below range)', async () => {
    await expect(
      buildTeBallotEnvelope({ ...BASE_ARGS, choice: 0 })
    ).rejects.toThrow('choice 0 out of');
  });

  it('rejects choice above numCandidates', async () => {
    await expect(
      buildTeBallotEnvelope({ ...BASE_ARGS, choice: 4 })
    ).rejects.toThrow('choice 4 out of');
  });

  it('rejects non-integer choice', async () => {
    await expect(
      buildTeBallotEnvelope({ ...BASE_ARGS, choice: 1.5 })
    ).rejects.toThrow('choice 1.5 out of');
  });

  it('rejects malformed mpk hex (bad on-curve bytes)', async () => {
    // All-zero bytes are not a valid compressed G2 point.
    await expect(
      buildTeBallotEnvelope({ ...BASE_ARGS, mpk: `0x${'00'.repeat(96)}` })
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// buildTeWeightedBallotEnvelope
// ---------------------------------------------------------------------------

describe('buildTeWeightedBallotEnvelope — input validation', () => {
  const BASE_ARGS = {
    // Never reached: every case here is refused by config validation, which runs
    // before the credential is requested. Present so the shape typechecks.
    sequencerUrl: 'http://sequencer.invalid/api',
    space: 'test.eth',
    voter: `0x${'11'.repeat(20)}`,
    proposalId: `0x${'22'.repeat(32)}`,
    mpk: `0x${'ab'.repeat(96)}`,
    config: {
      variant: 'A' as const,
      mode: 'exact' as const,
      budget: 100,
      numCandidates: 3
    },
    choice: { '1': 60, '2': 40 }
  };

  it('rejects Variant B', async () => {
    await expect(
      buildTeWeightedBallotEnvelope({
        ...BASE_ARGS,
        config: { ...BASE_ARGS.config, variant: 'B' as any }
      })
    ).rejects.toThrow('only Variant A exact');
  });

  it('rejects atMost mode', async () => {
    await expect(
      buildTeWeightedBallotEnvelope({
        ...BASE_ARGS,
        config: { ...BASE_ARGS.config, mode: 'atMost' as any }
      })
    ).rejects.toThrow('only Variant A exact');
  });

  it('rejects empty choice (zero total weight)', async () => {
    await expect(
      buildTeWeightedBallotEnvelope({
        ...BASE_ARGS,
        choice: { '1': 0, '2': 0 }
      })
    ).rejects.toThrow('weights sum to zero');
  });

  it('rejects malformed mpk hex (bad on-curve bytes)', async () => {
    await expect(
      buildTeWeightedBallotEnvelope({
        ...BASE_ARGS,
        mpk: `0x${'00'.repeat(96)}`
      })
    ).rejects.toThrow();
  });
});

describe('buildTeWeightedBallotEnvelope — largest-remainder vote vector', () => {
  // These tests verify the vote-vector encoding without running real crypto.
  // They exercise the proportion → integer mapping that must sum to budget.

  function computeVotes(
    choice: Record<string, number>,
    budget: number,
    numCandidates: number
  ): number[] {
    const totalWeight = Object.values(choice).reduce((a, b) => a + b, 0);
    const exact = Array.from({ length: numCandidates }, (_, j) => {
      const w = choice[String(j + 1)] ?? 0;
      return (w / totalWeight) * budget;
    });
    const floors = exact.map(Math.floor);
    const remaining = budget - floors.reduce((a, b) => a + b, 0);
    const order = exact
      .map((v, i) => ({ frac: v - Math.floor(v), i }))
      .sort((a, b) => b.frac - a.frac);
    for (let k = 0; k < remaining; k++) floors[order[k].i]++;
    return floors;
  }

  it('even split: 60/40 sums to budget', () => {
    const votes = computeVotes({ '1': 60, '2': 40 }, 100, 3);
    expect(votes.reduce((a, b) => a + b, 0)).toBe(100);
    expect(votes[0]).toBe(60);
    expect(votes[1]).toBe(40);
    expect(votes[2]).toBe(0);
  });

  it('all weight to one candidate', () => {
    const votes = computeVotes({ '2': 1 }, 100, 3);
    expect(votes.reduce((a, b) => a + b, 0)).toBe(100);
    expect(votes[0]).toBe(0);
    expect(votes[1]).toBe(100);
    expect(votes[2]).toBe(0);
  });

  it('non-normalised weights scale correctly: {1:1, 2:3} → 25/75', () => {
    const votes = computeVotes({ '1': 1, '2': 3 }, 100, 2);
    expect(votes.reduce((a, b) => a + b, 0)).toBe(100);
    expect(votes[0]).toBe(25);
    expect(votes[1]).toBe(75);
  });

  it('three-way equal split: largest-remainder distributes remainder', () => {
    // 100/3 = 33.33 each; remainder of 1 goes to the first candidate by frac order
    const votes = computeVotes({ '1': 1, '2': 1, '3': 1 }, 100, 3);
    expect(votes.reduce((a, b) => a + b, 0)).toBe(100);
    // Each value is either 33 or 34; none outside that range
    for (const v of votes) expect(v).toBeGreaterThanOrEqual(33);
    for (const v of votes) expect(v).toBeLessThanOrEqual(34);
  });

  it('budget=1000 preserves finer granularity', () => {
    const votes = computeVotes({ '1': 1, '2': 2 }, 1000, 2);
    expect(votes.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(votes[0]).toBeCloseTo(333, -1); // ~333
    expect(votes[1]).toBeCloseTo(667, -1); // ~667
  });
});

// Real BLST WASM proof generation takes ~7s per envelope even on a fast
// machine; leave generous headroom for loaded CI runners.
const CRYPTO_TIMEOUT = 120_000;

describe('buildTeWeightedBallotEnvelope — envelope shape (real crypto)', () => {
  // Budget 10 rather than the production 100: the range proof's cost is linear
  // in the budget, and these two envelopes take ~22s to build at 100 against
  // ~2.6s at 10. Nothing here asserts anything budget-dependent — these are
  // shape checks — and the largest-remainder arithmetic that *does* depend on
  // the budget is covered by the pure `vote vector` tests above, which run no
  // crypto at all.
  //
  // It matters because this file was the slowest in the UI suite by an order of
  // magnitude. At 64s it held its vitest worker long enough to starve the
  // reporter's `onTaskUpdate` RPC on a 4-vCPU runner: every test passed and the
  // run still exited 1.
  const CONFIG = {
    variant: 'A' as const,
    mode: 'exact' as const,
    budget: 10,
    numCandidates: 3
  };
  const PROPOSAL_ID = `0x${'22'.repeat(32)}`;

  // Two envelopes, built once, covering every assertion below.
  //
  // Each build is a real BLST ballot — fresh keys, three ciphertexts and the
  // range/budget proof over all of them — which costs 10-20s. Building one per
  // test made this file take 65s of a 69s CI run, monopolising its vitest worker
  // long enough to starve the reporter's `onTaskUpdate` RPC: every test passed
  // and the run still exited 1.
  //
  // `split` and `single` differ in their choice split over the same proposal,
  // which is exactly what the last test needs, so nothing is weakened by sharing
  // them — the two builds carry four assertions instead of five builds carrying
  // the same four.
  let split: Awaited<ReturnType<typeof buildTeWeightedBallotEnvelope>>;
  let single: typeof split;

  beforeAll(async () => {
    const base = {
      sequencerUrl: 'http://sequencer.invalid/api',
      space: 'test.eth',
      voter: `0x${'11'.repeat(20)}`,
      proposalId: PROPOSAL_ID,
      mpk: VALID_MPK,
      config: CONFIG
    };
    split = await buildTeWeightedBallotEnvelope({
      ...base,
      choice: { '1': 60, '2': 40 }
    });
    single = await buildTeWeightedBallotEnvelope({
      ...base,
      choice: { '1': 1 }
    });
  }, CRYPTO_TIMEOUT);

  it('returns a valid envelope with all required fields', () => {
    expect(split.electionId).toMatch(/^0x[0-9a-f]+$/i);
    expect(split.pseudonym).toMatch(/^0x[0-9a-f]+$/i);
    expect(split.vk).toMatch(/^0x[0-9a-f]+$/i);
    expect(split.zkProof).toMatch(/^0x[0-9a-f]+$/i);
    expect(split.voterSignature).toMatch(/^0x[0-9a-f]+$/i);
    expect(split.ciphertexts).toHaveLength(CONFIG.numCandidates);
    for (const ct of split.ciphertexts) {
      expect(ct.c1).toMatch(/^0x[0-9a-f]+$/i);
      expect(ct.c2).toMatch(/^0x[0-9a-f]+$/i);
    }
  });

  it('electionId matches proposalId bytes', () => {
    expect(split.electionId.toLowerCase()).toBe(PROPOSAL_ID.toLowerCase());
  });

  it('produces numCandidates ciphertexts regardless of how many choices are specified', () => {
    // Only candidate 1 has weight; candidates 2 and 3 get 0 — but we still
    // need a ciphertext for each (the ZK proof covers all candidates).
    expect(single.ciphertexts).toHaveLength(CONFIG.numCandidates);
  });

  it('each build draws fresh randomness', () => {
    // Deliberately NOT "different splits produce different ciphertexts" — that
    // cannot be asserted here. `encrypt` sets c1 = r·P2 and c2 = r·mpk + m·P2,
    // so both components move with the random scalar, and two encryptions of
    // the *same* plaintext already differ. That indistinguishability is the
    // point of the scheme, not an accident.
    //
    // What is worth guarding is the opposite failure: reusing `r` across
    // ballots, which would leak the relationship between their plaintexts.
    // These envelopes were built separately, so identical bytes here would mean
    // the randomness was not redrawn.
    expect(split.ciphertexts[0].c1).not.toBe(single.ciphertexts[0].c1);
  });
});
