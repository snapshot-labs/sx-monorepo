/**
 * In-memory voting types.
 *
 * These are the typed objects the SDK operates on during computation. The
 * on-chain / wire representation (G₂ compressed bytes, DLEQ bytes, ORProof
 * bytes) lives in `src/contract/` — codecs translate between the two.
 *
 * See Munich spec §4.2 (ElGamal ciphertext) and §5 (ballot layout).
 */

import { G1Point, G2Point } from '../crypto/curve';

/**
 * Linearly homomorphic threshold ElGamal ciphertext in G₂:
 *   C1 = r · P₂
 *   C2 = r · mpk + m · P₂
 * Produced by `encrypt`; consumed by homomorphic ops and decryption.
 */
export interface Ciphertext {
  c1: G2Point;
  c2: G2Point;
}

/**
 * Schnorr signature over G₁, used to bind a voter's ballot to her ephemeral
 * verification key vk = sk · P₁. Standard commitment/response form:
 *   R = k · P₁,  s = k + e · sk  (mod Q)
 * with challenge e = H(R ‖ vk ‖ msg).
 *
 * Verification recomputes `s · P₁ == R + e · vk` — no pairing needed.
 */
export interface SchnorrSig {
  R: G1Point;
  s: bigint;
}

/**
 * Chaum–Pedersen DLEQ proof over G₂: `logBase1(point1) == logBase2(point2)`.
 * Challenge–response form per Munich spec §6.1.3 / §6.3:
 *   commit  w ← Z_q,  a1 = w·base1, a2 = w·base2
 *   challenge  e = H(transcript ‖ a1 ‖ a2)
 *   response  z = w + x·e mod q   (x is the shared discrete log)
 * Verify: z·base1 ?= a1 + e·point1 and z·base2 ?= a2 + e·point2.
 *
 * Only (e, z) travels on the wire: the commitments a1, a2 are recomputed
 * by the verifier from the equation.
 */
export interface DLEQProof {
  e: bigint;
  z: bigint;
}

/** One branch of a (B+1)-branch OR proof. */
export interface ORProofBranch {
  a1: G2Point;
  a2: G2Point;
  e: bigint;
  z: bigint;
}

/**
 * Non-interactive OR composition of DLEQ proofs for ciphertext validity:
 * proves that `(C1, C2)` encrypts one of the fixed set of candidate values
 * `{m_0, ..., m_B}` without revealing which. Munich spec §6.1.1 (Variant A
 * range proof with B+1 branches) and §6.2.1 (Variant B bit proof with 2
 * branches) are both this same structure with different candidate sets.
 */
export interface ORProof {
  branches: ORProofBranch[];
}

/**
 * Budget proof for the ballot-level constraint on the homomorphic sum
 * `cΣ = Σ_j c_j`. Munich spec §6.1.3 / §6.2.2:
 *
 *   mode = 'exact'  → V = B : a single DLEQ proof that cΣ = Enc(B, mpk, rΣ)
 *                              (i.e. logP₂(cΣ.c1) = logmpk(cΣ.c2 − B·P₂) = rΣ).
 *   mode = 'atMost' → V ≤ B : a (B+1)-branch OR proof that cΣ encrypts one
 *                              of {0, 1, …, B}.
 *
 * The `mode` discriminator is bound into the Fiat–Shamir transcript inside
 * the prove/verify functions so an exact proof can never be re-interpreted
 * as an at-most proof (or vice versa) even on a ciphertext for which both
 * happen to be valid (e.g. V = B).
 */
export type BudgetProof =
  | { mode: 'exact'; proof: DLEQProof }
  | { mode: 'atMost'; proof: ORProof };

/**
 * The full ballot-level validity proof — the in-memory twin of the opaque
 * `zkProof: bytes` field on the on-chain Ballot. Encoded by
 * `encodeBallotValidityProof` into the wire layout documented in §5.3 of
 * the development plan.
 *
 *   Variant A (direct range proofs): `rangeOrBit.length == ℓ`, each proof
 *     is a (B+1)-branch OR over candidates {0, …, B}.
 *   Variant B (binary decomposition): `rangeOrBit.length == ℓ · d`, each
 *     proof is a 2-branch OR over {0, 1}. The caller reconstructs
 *     ĉ_j = Σ_k 2^k · c_{j,k} before verifying the budget.
 *
 * The `version` byte is the single forward-compatibility hook: future
 * schema changes bump this and ship a new decoder path.
 */
export interface BallotValidityProof {
  version: number; // wire value 0x01
  variant: 'A' | 'B';
  rangeOrBit: ORProof[];
  budget: BudgetProof;
}

/**
 * A keyper's public committee share — the pair (i, mpk_k) that goes on
 * chain via the DKG output. The SDK consumes these to verify decryption
 * shares; it never materialises them itself.
 */
/** @public */
export interface KeyperPublicShare {
  index: number; // 1-based evaluation point α_i used by the DKG
  mpk_k: G2Point; // = msk_k · P₂, i.e. the committee public key from DKGResult
}

/**
 * A single keyper's partial decryption of a ciphertext, plus the DLEQ
 * proof that binds σ_{k,j} to the keyper's committee public key.
 * Per-candidate: `sigma = msk_k · C1_sum` (Munich §6.3).
 *
 * The proof proves logP₂(mpk_k) == logC1(σ) == msk_k, so any verifier
 * that knows the on-chain `committeePK` can reject shares that were not
 * computed with the matching secret share.
 */
export interface PartialDecryption {
  keyperIndex: number; // 1-based evaluation point α_k
  sigma: G2Point; // σ_{k,j} = msk_k · ctSum.c1
  proof: DLEQProof;
}
