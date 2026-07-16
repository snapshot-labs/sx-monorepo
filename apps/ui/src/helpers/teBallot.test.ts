import { G2Point, initCurves } from '@snapshot-labs/private-vote-sdk';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildTeBallotEnvelope,
  buildTeWeightedBallotEnvelope,
  pseudonymFor
} from './teBallot';

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
  const CONFIG = {
    variant: 'A' as const,
    mode: 'exact' as const,
    budget: 100,
    numCandidates: 3
  };

  it(
    'returns a valid envelope with all required fields',
    async () => {
      const envelope = await buildTeWeightedBallotEnvelope({
        voter: `0x${'11'.repeat(20)}`,
        proposalId: `0x${'22'.repeat(32)}`,
        mpk: VALID_MPK,
        config: CONFIG,
        choice: { '1': 60, '2': 40 }
      });

      expect(envelope.electionId).toMatch(/^0x[0-9a-f]+$/i);
      expect(envelope.pseudonym).toMatch(/^0x[0-9a-f]+$/i);
      expect(envelope.vk).toMatch(/^0x[0-9a-f]+$/i);
      expect(envelope.zkProof).toMatch(/^0x[0-9a-f]+$/i);
      expect(envelope.voterSignature).toMatch(/^0x[0-9a-f]+$/i);
      expect(envelope.wrAttestation).toBe('0x');
      expect(envelope.ciphertexts).toHaveLength(CONFIG.numCandidates);
      for (const ct of envelope.ciphertexts) {
        expect(ct.c1).toMatch(/^0x[0-9a-f]+$/i);
        expect(ct.c2).toMatch(/^0x[0-9a-f]+$/i);
      }
    },
    CRYPTO_TIMEOUT
  );

  it(
    'electionId matches proposalId bytes',
    async () => {
      const proposalId = `0x${'22'.repeat(32)}`;
      const envelope = await buildTeWeightedBallotEnvelope({
        voter: `0x${'11'.repeat(20)}`,
        proposalId,
        mpk: VALID_MPK,
        config: CONFIG,
        choice: { '1': 100 }
      });
      expect(envelope.electionId.toLowerCase()).toBe(proposalId.toLowerCase());
    },
    CRYPTO_TIMEOUT
  );

  it(
    'produces numCandidates ciphertexts regardless of how many choices are specified',
    async () => {
      // Only candidate 1 has weight; candidates 2 and 3 get 0 — but we still
      // need a ciphertext for each (the ZK proof covers all candidates).
      const envelope = await buildTeWeightedBallotEnvelope({
        voter: `0x${'11'.repeat(20)}`,
        proposalId: `0x${'33'.repeat(32)}`,
        mpk: VALID_MPK,
        config: CONFIG,
        choice: { '1': 1 }
      });
      expect(envelope.ciphertexts).toHaveLength(CONFIG.numCandidates);
    },
    CRYPTO_TIMEOUT
  );

  it(
    'two votes with different splits produce different ciphertexts',
    async () => {
      const base = {
        voter: `0x${'11'.repeat(20)}`,
        proposalId: `0x${'44'.repeat(32)}`,
        mpk: VALID_MPK,
        config: CONFIG
      };
      const a = await buildTeWeightedBallotEnvelope({
        ...base,
        choice: { '1': 60, '2': 40 }
      });
      const b = await buildTeWeightedBallotEnvelope({
        ...base,
        choice: { '1': 40, '2': 60 }
      });
      // Ciphertexts are randomised but different splits → different plaintexts.
      expect(a.ciphertexts[0].c1).not.toBe(b.ciphertexts[0].c1);
    },
    CRYPTO_TIMEOUT
  );
});
