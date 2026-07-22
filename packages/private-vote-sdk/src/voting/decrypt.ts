/**
 * Decryption side of the Munich voting protocol (§6.3 + §4.2).
 *
 * Three roles share this file:
 *
 *   Keyper (narrow):    `partialDecrypt` — compute σ_{k,j} = msk_k · C1 and
 *                       the DLEQ proof binding it to the keyper's on-chain
 *                       committee public key. This is the ONE function
 *                       keypers pull from the SDK (plan §0 principle #6).
 *
 *   Tally Aggregator /
 *   auditor:            `verifyDecryptionShare` — reject any on-chain share
 *                       whose DLEQ proof doesn't match its committeePK.
 *                       `combineShares` — Lagrange-interpolate any t+1
 *                       verified shares to reconstruct τ = C2 − σ, i.e.
 *                       the plaintext-encoded group element V · P₂.
 *                       `recoverDiscreteLog` — baby-step-giant-step in G₂
 *                       to recover V (bounded, Munich-scale).
 *
 * DKG, secret-share storage, keyper networking, and committee management
 * stay OUT of this SDK by design.
 */

import { G2Point } from '../crypto/curve';
import { Q, modQ, scalarInv } from '../crypto/field';
import {
  type DLEQStatement,
  proveDLEQ,
  verifyDLEQ,
} from './proofs';
import { Transcript } from './transcript';
import type { Ciphertext, DLEQProof, PartialDecryption } from './types';

// ---------- partialDecrypt (keyper-side) ----------

/**
 * Keyper-only entry point. Produces σ_{k,j} = msk_k · C1 along with a
 * DLEQ proof that binds σ to the keyper's committee public key
 * `mpk_k = msk_k · P₂`. The witness `msk_k` NEVER leaves keyper trust —
 * this function is the one audited path that touches it.
 *
 * Transcript binding: `keyperIndex` (the 1-based evaluation point α_k
 * the DKG assigned) and the `committeePK` are both bound before the
 * DLEQ runs, so a proof generated for keyper k cannot be replayed under
 * keyper k′.
 */
export function partialDecrypt(
  ctSum: Ciphertext,
  msk_k: bigint,
  mpk_k: G2Point,
  keyperIndex: number,
  t: Transcript,
): PartialDecryption {
  if (!Number.isInteger(keyperIndex) || keyperIndex < 1 || keyperIndex > 0xffff) {
    throw new Error(`partialDecrypt: keyperIndex (${keyperIndex}) must be a 1..65535 integer`);
  }
  const sigma = ctSum.c1.mul(msk_k);

  bindDecryptionShare(t, ctSum, mpk_k, keyperIndex);
  const proof = proveDLEQ(
    decryptionShareDLEQInstance(ctSum, mpk_k, sigma),
    { x: modQ(msk_k) },
    t,
  );
  return { keyperIndex, sigma, proof };
}

/**
 * Verify a single keyper's DLEQ against the committee public key
 * advertised on chain (`DKGResult.committeePKs[share.keyperIndex - 1]`).
 * The caller supplies the transcript identically seeded with whatever
 * ballot / ciphertext context it already bound — we only add our own
 * per-share tags.
 */
export function verifyDecryptionShare(
  ctSum: Ciphertext,
  share: PartialDecryption,
  committeePK: G2Point,
  t: Transcript,
): boolean {
  if (
    !Number.isInteger(share.keyperIndex) ||
    share.keyperIndex < 1 ||
    share.keyperIndex > 0xffff
  ) {
    return false;
  }
  bindDecryptionShare(t, ctSum, committeePK, share.keyperIndex);
  return verifyDLEQ(
    decryptionShareDLEQInstance(ctSum, committeePK, share.sigma),
    share.proof,
    t,
  );
}

function decryptionShareDLEQInstance(
  ctSum: Ciphertext,
  committeePK: G2Point,
  sigma: G2Point,
): DLEQStatement {
  // Prove: logP₂(mpk_k) == logC1(σ) == msk_k.
  return {
    base1: G2Point.generator(),
    point1: committeePK,
    base2: ctSum.c1,
    point2: sigma,
  };
}

function bindDecryptionShare(
  t: Transcript,
  ctSum: Ciphertext,
  committeePK: G2Point,
  keyperIndex: number,
): void {
  t.appendPoint('dec:C1', ctSum.c1);
  t.appendPoint('dec:C2', ctSum.c2);
  t.appendPoint('dec:mpk_k', committeePK);
  t.append('dec:keyperIndex', u16BE(keyperIndex));
}

// ---------- combineShares (Lagrange interpolation at 0 in Z_Q) ----------

/**
 * Lagrange-combine any (at least) t+1 verified shares to produce
 * τ = C2 − σ, where σ = msk · C1 and msk = Σ_i λ_i(0) · msk_i.
 *
 * The caller MUST have already verified every share via
 * `verifyDecryptionShare`; this function does not re-verify.
 *
 *   evaluationPoints[i] = α_i  (the x-coordinate of shares[i] on the
 *   DKG secret-sharing polynomial). Per the CRY spec §6.3, keyper k's
 *   evaluation point is the 1-based index α_k, so this function
 *   enforces `evaluationPoints[i] === shares[i].keyperIndex` — passing
 *   a permuted or mismatched α silently produces a wrong-tally τ, which
 *   is worse than an exception.
 *
 * The number of shares must be exactly t+1 from the caller's perspective
 * — but this function doesn't know t. It just Lagrange-interpolates at
 * zero across whatever set you pass. Duplicates in `evaluationPoints`
 * throw (the Lagrange basis is undefined there).
 */
export function combineShares(
  shares: readonly PartialDecryption[],
  evaluationPoints: readonly bigint[],
  ctSum: Ciphertext,
): G2Point {
  if (shares.length === 0) {
    throw new Error('combineShares: need at least one share');
  }
  if (shares.length !== evaluationPoints.length) {
    throw new Error(
      `combineShares: shares.length (${shares.length}) != evaluationPoints.length (${evaluationPoints.length})`,
    );
  }
  const n = shares.length;
  const alphas: bigint[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = modQ(evaluationPoints[i]!);
    if (a === 0n) {
      throw new Error(`combineShares: evaluation point at index ${i} is 0 mod Q`);
    }
    const expected = BigInt(shares[i]!.keyperIndex);
    if (a !== expected) {
      throw new Error(
        `combineShares: evaluationPoints[${i}] (${a}) must equal shares[${i}].keyperIndex (${expected}) — ` +
          `mismatched α produces a wrong-tally τ indistinguishable from a correct one at the BSGS layer`,
      );
    }
    alphas[i] = a;
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (alphas[i] === alphas[j]) {
        throw new Error(
          `combineShares: duplicate evaluation point at indices ${i} and ${j}`,
        );
      }
    }
  }

  // σ = Σ_i λ_i(0) · σ_i, with λ_i(0) = Π_{j ≠ i} (-α_j) / (α_i - α_j).
  let sigma = G2Point.identity();
  for (let i = 0; i < n; i++) {
    let num = 1n;
    let den = 1n;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      num = modQ(num * (Q - alphas[j]!)); // -α_j mod Q
      den = modQ(den * modQ(alphas[i]! - alphas[j]!));
    }
    const lambdaI = modQ(num * scalarInv(den));
    sigma = sigma.add(shares[i]!.sigma.mul(lambdaI));
  }
  return ctSum.c2.sub(sigma);
}

// ---------- recoverDiscreteLog (BSGS in G₂) ----------

/**
 * Baby-step-giant-step: given τ ∈ G₂ and an upper bound N on the
 * plaintext, return the unique T ∈ [0, N] with τ = T · P₂. Throws if no
 * such T exists within the bound — the caller should treat this as a
 * tally-aggregation bug (the homomorphic sum ended up out of the
 * declared range) and not retry with a larger bound blindly.
 *
 * Runtime / memory: O(√N) group operations and O(√N) G₂ points held in
 * a hash map keyed on the canonical compressed encoding. For Munich-
 * scale (electorate in the thousands, B ≤ 10) this stays well under a
 * second in plain JS.
 *
 * Callers that recover many plaintexts against the same bound should
 * hoist the baby-step table via `buildBabyStepTable` and pass it to
 * `recoverDiscreteLogWithTable` to avoid re-building per call.
 */
export function recoverDiscreteLog(tau: G2Point, upperBound: bigint): bigint {
  if (upperBound < 0n) {
    throw new Error(`recoverDiscreteLog: upperBound (${upperBound}) must be non-negative`);
  }
  const table = buildBabyStepTable(upperBound);
  return recoverDiscreteLogWithTable(tau, table);
}

export interface BabyStepTable {
  readonly upperBound: bigint;
  readonly m: bigint; // ⌈√(N+1)⌉
  readonly giantStep: G2Point; // m · P₂, pre-computed for the giant-step loop
  readonly table: Map<string, bigint>; // key: compressed-hex of i·P₂, value: i
}

/**
 * Build the reusable baby-step table for a given upper bound. Amortises
 * the O(√N) build across many tally recoveries (all candidates in an
 * election share the same bound).
 */
export function buildBabyStepTable(upperBound: bigint): BabyStepTable {
  if (upperBound < 0n) {
    throw new Error(`buildBabyStepTable: upperBound (${upperBound}) must be non-negative`);
  }
  const m = ceilSqrt(upperBound + 1n);
  const P2 = G2Point.generator();
  const table = new Map<string, bigint>();
  let acc = G2Point.identity();
  for (let i = 0n; i < m; i++) {
    table.set(pointKey(acc), i);
    acc = acc.add(P2);
  }
  const giantStep = P2.mul(m);
  return { upperBound, m, giantStep, table };
}

/**
 * Look up τ in a pre-built baby-step table. Returns the unique
 * T ∈ [0, table.upperBound] with τ = T · P₂; throws if not found.
 */
export function recoverDiscreteLogWithTable(
  tau: G2Point,
  table: BabyStepTable,
): bigint {
  const { m, giantStep, upperBound, table: babySteps } = table;
  // Check j = 0 directly before entering the loop so τ = O returns 0 cleanly.
  let gamma = tau;
  const jMax = m; // j ranges 0..m, so that j·m + i spans up to m·(m+1) ≥ N+1.
  for (let j = 0n; j <= jMax; j++) {
    const key = pointKey(gamma);
    const i = babySteps.get(key);
    if (i !== undefined) {
      const T = j * m + i;
      if (T <= upperBound) return T;
      // A hit outside the bound is a tally bug; keep scanning in case of a
      // wrap, but treat the bound as authoritative.
    }
    gamma = gamma.sub(giantStep);
  }
  throw new Error(
    `recoverDiscreteLog: τ not in [0, ${upperBound}]·P₂ — tally sum exceeded the declared bound`,
  );
}

function pointKey(p: G2Point): string {
  const bytes = p.toBytes();
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i]!.toString(16).padStart(2, '0');
  }
  return s;
}

function ceilSqrt(n: bigint): bigint {
  if (n < 0n) throw new Error('ceilSqrt: negative');
  if (n < 2n) return n; // 0→0, 1→1
  // Newton-style integer sqrt, then bump.
  let x = n;
  let y = (x + 1n) >> 1n;
  while (y < x) {
    x = y;
    y = (x + n / x) >> 1n;
  }
  // x = floor(sqrt(n)); bump if not exact.
  return x * x === n ? x : x + 1n;
}

function u16BE(n: number): Uint8Array {
  const out = new Uint8Array(2);
  out[0] = (n >>> 8) & 0xff;
  out[1] = n & 0xff;
  return out;
}
