import { G2Point, initCurves } from '@shutter-network/urban-verified-crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  buildTeBallotEnvelope,
  buildTeWeightedBallotEnvelope,
  pseudonymFor,
  weightedVoteVector
} from './teBallot';
import * as TeCredential from './teCredential';

// Only the credential request is stubbed; ballot building and signing are real.
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

// Must equal the sequencer's `expectedPseudonym` test vector: the sequencer
// rejects a ballot with any other pseudonym.
describe('pseudonymFor', () => {
  it('is keccak256(voter address ‖ proposal id)', () => {
    const out = pseudonymFor(
      '0x1111111111111111111111111111111111111111',
      `0x${'22'.repeat(32)}`
    );
    expect(`0x${Buffer.from(out).toString('hex')}`).toBe(
      '0x2bc0e4453d022b3e9e099d968a3291ad16b616abdb07af6b9d3b771b8b35da13'
    );
  });
});

// G2Point.generator() is a valid point, used as a stand-in mpk so the crypto runs
// without a real DKG key.
let VALID_MPK = '';
beforeAll(async () => {
  await initCurves();
  const gen = G2Point.generator();
  VALID_MPK = `0x${Buffer.from(gen.toBytes()).toString('hex')}`;
  gen.destroyWasm();
});

describe('buildTeBallotEnvelope — input validation', () => {
  const BASE_ARGS = {
    // Not called: validation fails before the credential is requested.
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

  it.each([
    ['Variant B', { variant: 'B' as any }],
    ['atMost mode', { mode: 'atMost' as any }],
    ['budget != 1', { budget: 5 }]
  ])('rejects %s', async (_label, config) => {
    await expect(
      buildTeBallotEnvelope({
        ...BASE_ARGS,
        config: { ...BASE_ARGS.config, ...config }
      })
    ).rejects.toThrow('only Variant A exact B=1');
  });

  // The choice is 1-based and must name one of the candidates.
  it.each([0, 4, 1.5])('rejects choice %s', async choice => {
    await expect(
      buildTeBallotEnvelope({ ...BASE_ARGS, choice })
    ).rejects.toThrow(`choice ${choice} out of`);
  });
});

// ---------------------------------------------------------------------------
// buildTeWeightedBallotEnvelope
// ---------------------------------------------------------------------------

describe('buildTeWeightedBallotEnvelope — input validation', () => {
  const BASE_ARGS = {
    // Not called: validation fails before the credential is requested.
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

  it.each([
    ['Variant B', { variant: 'B' as any }],
    ['atMost mode', { mode: 'atMost' as any }]
  ])('rejects %s', async (_label, config) => {
    await expect(
      buildTeWeightedBallotEnvelope({
        ...BASE_ARGS,
        config: { ...BASE_ARGS.config, ...config }
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
});

// The real function the weighted builder uses, without running any crypto. The
// votes must add up exactly to the budget; leftovers go to the largest
// remainders.
describe('weightedVoteVector — largest-remainder vote vector', () => {
  it.each([
    ['an even 60/40 split', { '1': 60, '2': 40 }, 100, 3, [60, 40, 0]],
    ['all weight to one candidate', { '2': 1 }, 100, 3, [0, 100, 0]],
    ['non-normalised weights', { '1': 1, '2': 3 }, 100, 2, [25, 75]],
    // 100/3 = 33.33 each; the leftover vote goes to the first candidate.
    [
      'a three-way equal split',
      { '1': 1, '2': 1, '3': 1 },
      100,
      3,
      [34, 33, 33]
    ],
    ['budget 1000', { '1': 1, '2': 2 }, 1000, 2, [333, 667]]
  ])('%s', (_label, choice, budget, numCandidates, expected) => {
    const votes = weightedVoteVector(choice, budget, numCandidates);
    expect(votes).toEqual(expected);
    expect(votes.reduce((a, b) => a + b, 0)).toBe(budget);
  });
});

// Real BLST proof generation takes seconds per envelope; allow plenty for slow CI.
const CRYPTO_TIMEOUT = 120_000;

describe('buildTeWeightedBallotEnvelope — envelope shape (real crypto)', () => {
  // Budget 10 instead of the production 100, because proof cost grows with the
  // budget. This is a shape check only; the budget arithmetic is covered by the
  // `weightedVoteVector` tests above.
  const CONFIG = {
    variant: 'A' as const,
    mode: 'exact' as const,
    budget: 10,
    numCandidates: 3
  };
  const PROPOSAL_ID = `0x${'22'.repeat(32)}`;

  it(
    'returns a valid envelope with a ciphertext for every candidate',
    async () => {
      // Only candidate 1 has weight, but every candidate still needs a
      // ciphertext (the proof covers all of them).
      const envelope = await buildTeWeightedBallotEnvelope({
        sequencerUrl: 'http://sequencer.invalid/api',
        space: 'test.eth',
        voter: `0x${'11'.repeat(20)}`,
        proposalId: PROPOSAL_ID,
        mpk: VALID_MPK,
        config: CONFIG,
        choice: { '1': 1 }
      });
      expect(envelope.electionId.toLowerCase()).toBe(PROPOSAL_ID.toLowerCase());
      expect(envelope.pseudonym).toMatch(/^0x[0-9a-f]+$/i);
      expect(envelope.vk).toMatch(/^0x[0-9a-f]+$/i);
      expect(envelope.zkProof).toMatch(/^0x[0-9a-f]+$/i);
      expect(envelope.voterSignature).toMatch(/^0x[0-9a-f]+$/i);
      expect(envelope.ciphertexts).toHaveLength(CONFIG.numCandidates);
      for (const ct of envelope.ciphertexts) {
        expect(ct.c1).toMatch(/^0x[0-9a-f]+$/i);
        expect(ct.c2).toMatch(/^0x[0-9a-f]+$/i);
      }
    },
    CRYPTO_TIMEOUT
  );
});
