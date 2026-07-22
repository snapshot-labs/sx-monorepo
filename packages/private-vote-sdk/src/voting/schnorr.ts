/**
 * Single-point Schnorr signatures over G₁, used by the voter to bind her
 * ballot to the ephemeral verification key vk = sk · P₁ registered with the
 * Wahlregister-Server (Munich spec §5.2).
 *
 *   keygen:  sk ← Z_q,  vk := sk · P₁
 *   sign:    k ← Z_q,  R := k · P₁,  e := H(R ‖ vk ‖ msg),  s := k + e·sk
 *   verify:  e := H(R ‖ vk ‖ msg),   accept iff s · P₁ == R + e · vk
 *
 * Chosen over BLS per the Munich spec so verification stays in G₁ without a
 * pairing. The `msg` parameter is the ballot preimage produced by
 * `canonicalBallotMessage` (P6); for now the scheme is message-agnostic.
 *
 * The optional `sk` / `k` parameters exist for tests and interop with
 * externally sampled randomness; production callers always omit them.
 */

import { G1Point } from '../crypto/curve';
import { modQ, randomScalar } from '../crypto/field';
import { DST_FIAT_SHAMIR, hashToScalar } from '../crypto/hash';
import { SchnorrSig } from './types';

const encoder = new TextEncoder();
const DST_SCHNORR = encoder.encode('SHUTTER-VOTE-SCHNORR-v1');

function challenge(R: G1Point, vk: G1Point, msg: Uint8Array): bigint {
  return hashToScalar(DST_SCHNORR, R.toBytes(), vk.toBytes(), msg);
}

export function schnorrKeygen(sk: bigint = randomScalar()): {
  sk: bigint;
  vk: G1Point;
} {
  const reduced = modQ(sk);
  if (reduced === 0n) {
    // sk = 0 ⇒ vk = identity, and `s·P₁ == R + e·O = R` makes every
    // signature trivially verify. Spec assumes random sk, so reject.
    throw new Error('schnorrKeygen: sk must be non-zero mod Q');
  }
  const P1 = G1Point.generator();
  const vk = P1.mul(reduced);
  P1.destroyWasm();
  return { sk: reduced, vk };
}

export function schnorrSign(
  sk: bigint,
  vk: G1Point,
  msg: Uint8Array,
  k: bigint = randomScalar()
): SchnorrSig {
  const P1 = G1Point.generator();
  const R = P1.mul(k);
  P1.destroyWasm();
  const e = challenge(R, vk, msg);
  const s = modQ(k + e * modQ(sk));
  return { R, s };
}

export function schnorrVerify(
  vk: G1Point,
  msg: Uint8Array,
  sig: SchnorrSig
): boolean {
  // Identity vk trivially satisfies `s·P₁ == R + e·O = R`, so any
  // (R = s·P₁, s) pair passes regardless of msg. Reject at the gate.
  if (vk.isIdentity()) return false;
  const e = challenge(sig.R, vk, msg);
  const P1 = G1Point.generator();
  const lhs = P1.mul(sig.s);
  P1.destroyWasm();
  const vkE = vk.mul(e);
  const rhs = sig.R.add(vkE);
  vkE.destroyWasm();
  const ok = lhs.equals(rhs);
  lhs.destroyWasm();
  rhs.destroyWasm();
  return ok;
}

// Re-export so the Fiat–Shamir DST is importable if callers want to mix it
// into their own transcript construction.
/** @public */
export { DST_FIAT_SHAMIR };
