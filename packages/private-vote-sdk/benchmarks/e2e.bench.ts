/**
 * Full-scale HL_ARC end-to-end benchmark: the dev-plan §7.4 shape of
 * `n=5, t=2, ℓ=15, B=10, p=100`. Mirrors tests/voting.e2e.test.ts but
 * at the spec's voter count — too slow for the regular `npm test`
 * suite, and pushes the blst WASM heap hard enough that we aggregate
 * incrementally rather than retaining every ballot.
 *
 * Reports three headline numbers:
 *   - total prove + Vote-Proxy-verify wall-clock across p voters
 *   - total threshold-decrypt wall-clock across ℓ candidates
 *   - proof-size column (bytes of the canonical zkProof blob)
 */

import {
  BallotVerifyParams,
  Ciphertext,
  G2Point,
  Transcript,
  addCt,
  buildBabyStepTable,
  combineShares,
  encodeBallotValidityProof,
  initCurves,
  partialDecrypt,
  recoverDiscreteLogWithTable,
  verifyBallot,
  verifyDecryptionShare,
} from '../src';
import { simulateDKG } from '../tests/lib/dkg';
import { buildBallot } from './lib/ballot';

beforeAll(async () => {
  await initCurves();
});

// 15 minutes: 100 voters × ~7s/voter prove+verify ≈ 12 min in the
// worst case, plus tally work and warm-up. Jest's default is 5s.
jest.setTimeout(900_000);

const accept = () => true;

// The vendored blst.wasm is compiled with `INITIAL_MEMORY=16MB` and no
// `ALLOW_MEMORY_GROWTH`, so the full p=100 scenario cannot run to
// completion in a single Node process today (it OOMs around voter 10
// because each ballot's prove step allocates several MB of transient
// WASM points that can't be freed until the surrounding JS stack
// unwinds and the `FinalizationRegistry` in `src/crypto/curve.ts` can
// actually fire). The test stays here as a living target for when we
// rebuild blst with memory growth.
describe.skip('HL_ARC end-to-end (full scale)', () => {
  it('n=5, t=2, ℓ=15, B=10, p=100 — Variant A', () => {
    const n = 5;
    const t = 2;
    const ℓ = 15;
    const B = 10;
    const p = 100;

    const dkg = simulateDKG(t, n);
    const electionId = new Uint8Array(32).fill(0xe1);
    const params: BallotVerifyParams = {
      numCandidates: ℓ,
      budget: B,
      mode: 'atMost',
      variant: 'A',
    };

    // Deterministic vote vectors keyed on voter index.
    function pickVotes(v: number): bigint[] {
      const out = new Array<bigint>(ℓ).fill(0n);
      if (v % 2 === 0) {
        out[v % ℓ] = BigInt(B);
      } else {
        out[v % ℓ] = BigInt(Math.floor(B / 2));
        out[(v + 1) % ℓ] = BigInt(B - Math.floor(B / 2));
      }
      return out;
    }

    const expected: bigint[] = new Array(ℓ).fill(0n);
    for (let v = 0; v < p; v++) {
      const votes = pickVotes(v);
      for (let j = 0; j < ℓ; j++) expected[j]! += votes[j]!;
    }

    // Aggregate ciphertexts on the fly to keep the WASM heap bounded —
    // retaining all p ballots at once OOMs the blst.wasm module.
    const ctSum: (Ciphertext | null)[] = new Array(ℓ).fill(null);
    let zkProofSize = 0;

    const proveVerifyStart = performance.now();
    for (let v = 0; v < p; v++) {
      const votes = pickVotes(v);
      const { inputs, bvp } = buildBallot({
        mpk: dkg.mpk,
        electionId,
        pseudonym: new Uint8Array(32).fill((v % 255) + 1),
        votes,
        params,
      });
      if (v === 0) zkProofSize = encodeBallotValidityProof(bvp).length;

      const r = verifyBallot(inputs, params, dkg.mpk, accept);
      expect(r).toEqual({ ok: true });

      for (let j = 0; j < ℓ; j++) {
        const [c1, c2] = inputs.ciphertexts[j]!;
        const ct: Ciphertext = {
          c1: G2Point.fromBytes(c1),
          c2: G2Point.fromBytes(c2),
        };
        ctSum[j] = ctSum[j] === null ? ct : addCt(ctSum[j]!, ct);
      }

      // Force JS GC so blst.wasm point handles get finalised and the
      // underlying WASM memory reclaimed. Without this the 16MB heap
      // fills after ~20 voters regardless of JS-side reference counts.
      // Requires `node --expose-gc`; the bench script in package.json
      // wires it up via NODE_OPTIONS.
      if (typeof (globalThis as { gc?: () => void }).gc === 'function') {
        (globalThis as { gc: () => void }).gc();
      }
    }
    const proveVerifyMs = performance.now() - proveVerifyStart;

    // Tally: threshold decrypt each aggregate with t+1 shares.
    const subset = [0, 2, 4]; // α = 1, 3, 5
    const alphas = subset.map((k) => dkg.alphas[k]!);
    const table = buildBabyStepTable(BigInt(p * B));

    const decryptStart = performance.now();
    for (let j = 0; j < ℓ; j++) {
      const shares = subset.map((k) => {
        const s = partialDecrypt(
          ctSum[j]!,
          dkg.msk_k[k]!,
          dkg.mpk_k[k]!,
          k + 1,
          new Transcript(`tally:${j}:${k + 1}`),
        );
        const ok = verifyDecryptionShare(
          ctSum[j]!,
          s,
          dkg.mpk_k[k]!,
          new Transcript(`tally:${j}:${k + 1}`),
        );
        expect(ok).toBe(true);
        return s;
      });
      const tau = combineShares(shares, alphas, ctSum[j]!);
      const V = recoverDiscreteLogWithTable(tau, table);
      expect(V).toBe(expected[j]);
    }
    const decryptMs = performance.now() - decryptStart;

    // eslint-disable-next-line no-console
    console.log(
      `\nHL_ARC end-to-end (n=${n}, t=${t}, ℓ=${ℓ}, B=${B}, p=${p}):\n` +
        `  prove+verify total : ${(proveVerifyMs / 1000).toFixed(1)} s   (≈ ${(proveVerifyMs / p).toFixed(0)} ms/voter)\n` +
        `  threshold decrypt  : ${(decryptMs / 1000).toFixed(2)} s   (${ℓ} candidates, t+1=${subset.length} shares)\n` +
        `  zkProof size       : ${zkProofSize} bytes`,
    );
  });
});
