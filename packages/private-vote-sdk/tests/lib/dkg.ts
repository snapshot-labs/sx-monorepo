/**
 * Synthetic Shamir (t, n) DKG simulator — tests and benchmarks only.
 *
 * NOT exported from the SDK. The real Shutter keyper network runs a
 * live DKG; for local crypto correctness we just pick the polynomial
 * ourselves and hand out evaluations as if the DKG succeeded.
 */

import { G2Point } from '../../src';
import { modQ, randomScalar } from '../../src/crypto/field';

export interface DKGSim {
  msk: bigint;
  mpk: G2Point;
  /** α_k = k+1 for k ∈ [0, n); Shamir evaluation points. */
  alphas: bigint[];
  /** msk_k = f(α_k). */
  msk_k: bigint[];
  /** mpk_k = msk_k · P₂. */
  mpk_k: G2Point[];
  /** polynomial coefficients c_0 = msk, c_1, ..., c_t. */
  coeffs: bigint[];
}

export function simulateDKG(t: number, n: number): DKGSim {
  const coeffs: bigint[] = new Array(t + 1);
  for (let i = 0; i <= t; i++) coeffs[i] = randomScalar();
  const msk = coeffs[0]!;
  const P2 = G2Point.generator();
  const mpk = P2.mul(msk);
  const alphas: bigint[] = [];
  const msk_k: bigint[] = [];
  const mpk_k: G2Point[] = [];
  for (let k = 0; k < n; k++) {
    const a = BigInt(k + 1);
    alphas.push(a);
    let acc = 0n;
    let pow = 1n;
    for (let i = 0; i <= t; i++) {
      acc = modQ(acc + coeffs[i]! * pow);
      pow = modQ(pow * a);
    }
    msk_k.push(acc);
    mpk_k.push(P2.mul(acc));
  }
  return { msk, mpk, alphas, msk_k, mpk_k, coeffs };
}
