/**
 * Decryption-side benchmarks:
 *
 *   - partialDecrypt       (keyper hot path)
 *   - verifyDecryptionShare (tally aggregator per-share verification)
 *   - combineShares         across t+1 ∈ {3, 5, 7}
 *   - buildBabyStepTable    + recoverDiscreteLogWithTable for N ∈ {1e4, 1e5}
 *
 * The BSGS split is deliberate: the table is built once per election and
 * reused across every candidate tally, so the per-lookup cost is what
 * matters in aggregate.
 */

import {
  G2Point,
  Transcript,
  buildBabyStepTable,
  combineShares,
  encrypt,
  initCurves,
  partialDecrypt,
  recoverDiscreteLogWithTable,
  sumCts,
  verifyDecryptionShare,
} from '../src';
import { randomScalar } from '../src/crypto/field';
import { bench } from './lib/timer';

beforeAll(async () => {
  await initCurves();
});

function setupKeyperCommittee(t: number, n: number): {
  msks: bigint[];
  mpks: G2Point[];
  alphas: bigint[];
} {
  // Random polynomial of degree t with secret msk. Keyper k (1-based)
  // holds f(α_k). For the benches we only need t+1 shares at any (α, f(α))
  // set, so generate n shares on α_k = k and let the caller pick a subset.
  const coeffs = Array.from({ length: t + 1 }, () => randomScalar());
  const evalAt = (x: bigint): bigint => {
    let acc = 0n;
    let pow = 1n;
    for (const c of coeffs) {
      acc += c * pow;
      pow *= x;
    }
    return acc;
  };
  const msks: bigint[] = [];
  const mpks: G2Point[] = [];
  const alphas: bigint[] = [];
  for (let k = 1; k <= n; k++) {
    const msk_k = evalAt(BigInt(k));
    msks.push(msk_k);
    mpks.push(G2Point.generator().mul(msk_k));
    alphas.push(BigInt(k));
  }
  return { msks, mpks, alphas };
}

describe('decryption side', () => {
  it('partialDecrypt / verifyDecryptionShare / combineShares', async () => {
    const mpk = G2Point.generator().mul(randomScalar());
    // Make a ctSum for a modest tally so the benches mirror production.
    const cts = Array.from({ length: 100 }, () => encrypt(0n, mpk).ct);
    const ctSum = sumCts(cts);

    for (const tPlus1 of [3, 5, 7]) {
      const t = tPlus1 - 1;
      const { msks, mpks, alphas } = setupKeyperCommittee(t, tPlus1);

      await bench(
        `partialDecrypt (t+1=${tPlus1})`,
        { iterations: 20 },
        () => {
          partialDecrypt(ctSum, msks[0]!, mpks[0]!, 1, new Transcript('Bench'));
        },
      );

      // Pre-build shares once for the verify+combine benches.
      const shares = msks.map((msk, i) =>
        partialDecrypt(ctSum, msk, mpks[i]!, i + 1, new Transcript('Bench')),
      );

      await bench(
        `verifyDecryptionShare (t+1=${tPlus1})`,
        { iterations: 20 },
        () => {
          verifyDecryptionShare(ctSum, shares[0]!, mpks[0]!, new Transcript('Bench'));
        },
      );

      await bench(
        `combineShares (t+1=${tPlus1})`,
        { iterations: 20 },
        () => {
          combineShares(shares, alphas, ctSum);
        },
      );
    }
  });

  it('BSGS: table build + per-lookup recovery', async () => {
    for (const N of [10_000n, 100_000n]) {
      await bench(
        `buildBabyStepTable (N=${N})`,
        { iterations: 3 },
        () => {
          buildBabyStepTable(N);
        },
      );
      const table = buildBabyStepTable(N);
      // Pick a target τ = T · P₂ for T ≈ N/2 — gives a mid-range giant-step count.
      const T = N / 2n;
      const tau = G2Point.generator().mul(T);
      await bench(
        `recoverDiscreteLogWithTable (T≈N/2, N=${N})`,
        { iterations: 20 },
        () => {
          recoverDiscreteLogWithTable(tau, table);
        },
      );
    }
  });
});
