/**
 * Property-based tests per dev-plan §7.2. Three properties:
 *
 *   (i)   Random m ∈ {0..B}, random r: verifyOR accepts the honest proof.
 *   (ii)  Random valid vote vector: verifyBallot returns ok.
 *   (iii) Any 1-bit flip in a valid ballot's ciphertext or zkProof:
 *         verifyBallot rejects.
 *
 * `numRuns` is kept low because every run executes real BLS12-381
 * operations; see benchmarks/ for per-op cost.
 */

import fc from 'fast-check';
import {
  BallotVerifyParams,
  G2Point,
  Transcript,
  encrypt,
  initCurves,
  proveOR,
  verifyBallot,
} from '../src';
import { randomScalar } from '../src/crypto/field';
import { verifyOR } from '../src/voting/proofs';
import { buildBallot } from '../benchmarks/lib/ballot';

beforeAll(async () => {
  await initCurves();
});

function mpk(): G2Point {
  return G2Point.generator().mul(randomScalar());
}

const accept = () => true;

describe('property — OR proof completeness', () => {
  it('verifyOR accepts honest proof for random m ∈ {0..B}', async () => {
    const pk = mpk();
    // Pair (B, m) together so m ≤ B is guaranteed by construction.
    const pair = fc
      .integer({ min: 1, max: 5 })
      .chain((B) =>
        fc.integer({ min: 0, max: B }).map((m) => ({ B, m })),
      );
    await fc.assert(
      fc.property(pair, ({ B, m }) => {
        const candidates: bigint[] = [];
        for (let i = 0; i <= B; i++) candidates.push(BigInt(i));
        const { ct, r } = encrypt(BigInt(m), pk);
        const proof = proveOR(
          { ct, mpk: pk, candidates },
          { r, trueIndex: m },
          new Transcript('prop'),
        );
        return (
          verifyOR(
            { ct, mpk: pk, candidates },
            proof,
            new Transcript('prop'),
          ) === true
        );
      }),
      { numRuns: 10 },
    );
  }, 120_000);
});

describe('property — verifyBallot on random valid vote vectors', () => {
  const params: BallotVerifyParams = {
    numCandidates: 3,
    budget: 3,
    mode: 'atMost',
    variant: 'A',
  };

  it('honest ballots always verify', async () => {
    const pk = mpk();
    fc.assert(
      fc.property(
        // Votes in [0, B] per candidate; budget-valid iff sum ≤ B.
        fc
          .tuple(
            fc.integer({ min: 0, max: params.budget }),
            fc.integer({ min: 0, max: params.budget }),
            fc.integer({ min: 0, max: params.budget }),
          )
          .filter(([a, b, c]) => a + b + c <= params.budget),
        (triple) => {
          const votes = triple.map((v) => BigInt(v));
          const { inputs } = buildBallot({
            mpk: pk,
            electionId: new Uint8Array(32).fill(0x11),
            pseudonym: new Uint8Array(32).fill(0x22),
            votes,
            params,
          });
          return verifyBallot(inputs, params, pk, accept).ok === true;
        },
      ),
      { numRuns: 8 },
    );
  }, 180_000);
});

describe('property — 1-bit flip always rejects', () => {
  const params: BallotVerifyParams = {
    numCandidates: 3,
    budget: 3,
    mode: 'atMost',
    variant: 'A',
  };

  it('flipping any bit in a ciphertext or zkProof byte is rejected', async () => {
    const pk = mpk();
    // Build one valid ballot up front; reuse it across all flip targets.
    const { inputs } = buildBallot({
      mpk: pk,
      electionId: new Uint8Array(32).fill(0xaa),
      pseudonym: new Uint8Array(32).fill(0xbb),
      votes: [1n, 1n, 1n],
      params,
    });

    // Sanity: the base ballot verifies.
    expect(verifyBallot(inputs, params, pk, accept).ok).toBe(true);

    const totalCipherBytes = inputs.ciphertexts.length * 2 * 96;
    const zkLen = inputs.zkProof.length;

    fc.assert(
      fc.property(
        // Pick a target region ("c" = ciphertexts, "z" = zkProof), a byte
        // offset inside it, and a bit index within that byte.
        fc.record({
          region: fc.constantFrom('c', 'z'),
          byte: fc.integer({ min: 0, max: Math.max(totalCipherBytes, zkLen) - 1 }),
          bit: fc.integer({ min: 0, max: 7 }),
        }),
        ({ region, byte, bit }) => {
          if (region === 'c') {
            const idx = byte % totalCipherBytes;
            const ctIdx = Math.floor(idx / (2 * 96));
            const half = Math.floor((idx % (2 * 96)) / 96);
            const off = idx % 96;
            const cts = inputs.ciphertexts.map(
              ([c1, c2]) =>
                [new Uint8Array(c1), new Uint8Array(c2)] as [
                  Uint8Array,
                  Uint8Array,
                ],
            );
            cts[ctIdx]![half]![off]! ^= 1 << bit;
            return (
              verifyBallot(
                { ...inputs, ciphertexts: cts },
                params,
                pk,
                accept,
              ).ok === false
            );
          } else {
            const idx = byte % zkLen;
            const z = new Uint8Array(inputs.zkProof);
            z[idx]! ^= 1 << bit;
            return (
              verifyBallot({ ...inputs, zkProof: z }, params, pk, accept)
                .ok === false
            );
          }
        },
      ),
      { numRuns: 30 },
    );
  }, 180_000);
});
