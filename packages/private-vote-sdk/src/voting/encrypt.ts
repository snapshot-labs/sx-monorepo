/**
 * Linearly homomorphic threshold ElGamal encryption in G₂.
 *
 * Per Munich spec §4.2:
 *   Enc(m, mpk, r) = (r · P₂, r · mpk + m · P₂)
 *   Eval((C₁, C₂), (C₁', C₂')) = (C₁ + C₁', C₂ + C₂')
 *
 * `encrypt` returns both the ciphertext AND the randomness `r`. The caller
 * (voter side) needs `r` to produce the range / bit / budget proofs — this
 * is a deliberate deviation from the production IBE SDK, which hid `r`
 * inside the encrypt call.
 *
 * The optional `r` argument lets callers (tests, Variant-B assembly,
 * deterministic test vectors) inject pre-sampled randomness. Voters in
 * production always omit it and the function samples fresh via
 * `randomScalar()`.
 */

import { G2Point } from '../crypto/curve';
import { modQ, randomScalar } from '../crypto/field';
import { Ciphertext } from './types';

export function encrypt(
  m: bigint,
  mpk: G2Point,
  r: bigint = randomScalar(),
): { ct: Ciphertext; r: bigint } {
  const P2 = G2Point.generator();
  const c1 = P2.mul(r);
  const mpkR = mpk.mul(r);
  const P2m = P2.mul(modQ(m));
  const c2 = mpkR.add(P2m);
  mpkR.destroyWasm();
  P2m.destroyWasm();
  P2.destroyWasm();
  return { ct: { c1, c2 }, r };
}

/** Componentwise addition of two ciphertexts: Enc(m₁) ⊕ Enc(m₂) = Enc(m₁+m₂). */
export function addCt(a: Ciphertext, b: Ciphertext): Ciphertext {
  return { c1: a.c1.add(b.c1), c2: a.c2.add(b.c2) };
}

/** Scalar multiplication on a ciphertext: k · Enc(m) = Enc(k·m). */
export function scalarMulCt(k: bigint, a: Ciphertext): Ciphertext {
  return { c1: a.c1.mul(k), c2: a.c2.mul(k) };
}

/** Homomorphic sum of an arbitrary-length list of ciphertexts. */
export function sumCts(cts: readonly Ciphertext[]): Ciphertext {
  if (cts.length === 0) {
    return { c1: G2Point.identity(), c2: G2Point.identity() };
  }
  if (cts.length === 1) return cts[0]!;
  // Start from addCt(cts[0], cts[1]) so every acc we own is a fresh
  // allocation and can be freed when superseded, avoiding WASM heap leaks
  // at the 16MB boundary for large candidate/voter counts.
  let acc = addCt(cts[0]!, cts[1]!);
  for (let i = 2; i < cts.length; i++) {
    const prev = acc;
    acc = addCt(prev, cts[i]!);
    prev.c1.destroyWasm();
    prev.c2.destroyWasm();
  }
  return acc;
}
