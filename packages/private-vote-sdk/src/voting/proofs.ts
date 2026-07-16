/**
 * Non-interactive zero-knowledge proofs for the voting SDK.
 *
 * All proofs are Fiat–Shamir transforms of sigma protocols. The caller
 * constructs a `Transcript`, seeds it with every public input that needs
 * to bind the proof (per Munich §6: at minimum electionId, mpk, vk, the
 * ciphertexts under proof — see each function for what it additionally
 * appends), and passes the transcript through. Prover and verifier must
 * seed identically.
 *
 *   proveDLEQ / verifyDLEQ   Chaum–Pedersen equality of discrete logs
 *                            across two G₂ bases. Building block for the
 *                            keyper decryption-share proof (§6.3, P5)
 *                            and the exact-budget proof (§6.1.3).
 *
 *   proveOR   / verifyOR    (B+1)-branch disjunction: ciphertext
 *                            encrypts one of {m_0, …, m_B}. Used for
 *                            Variant-A range proofs (§6.1.1), Variant-B
 *                            bit proofs (§6.2.1, with M = {0,1}), and
 *                            at-most budget proofs (§6.1.3 / §6.2.2).
 */

import { G2Point } from '../crypto/curve';
import { modQ, randomScalar } from '../crypto/field';
import type {
  BudgetProof,
  Ciphertext,
  DLEQProof,
  ORProof,
  ORProofBranch,
} from './types';
import { Transcript } from './transcript';

// ---------- DLEQ (Chaum–Pedersen) ----------

export interface DLEQStatement {
  base1: G2Point;
  point1: G2Point; // = x · base1
  base2: G2Point;
  point2: G2Point; // = x · base2
}

export interface DLEQWitness {
  x: bigint;
}

/**
 * Prove logBase1(point1) == logBase2(point2) == x.
 *
 * `commit.w` is the sigma-protocol commitment randomness. Omit it in
 * production; injecting a value is for deterministic test vectors. The
 * value MUST be fresh (≠ any challenge) to preserve zero-knowledge — it
 * is never exposed on the wire.
 */
export function proveDLEQ(
  stmt: DLEQStatement,
  witness: DLEQWitness,
  t: Transcript,
  commit: { w?: bigint } = {},
): DLEQProof {
  const w = commit.w ?? randomScalar();
  const a1 = stmt.base1.mul(w);
  const a2 = stmt.base2.mul(w);

  bindStatementDLEQ(t, stmt);
  t.appendPoint('dleq:a1', a1);
  t.appendPoint('dleq:a2', a2);
  const e = t.challenge('dleq:e');
  const z = modQ(w + witness.x * e);
  a1.destroyWasm();
  a2.destroyWasm();
  return { e, z };
}

export function verifyDLEQ(
  stmt: DLEQStatement,
  proof: DLEQProof,
  t: Transcript,
): boolean {
  // Recompute commitments from the verification equation:
  //   a1 = z·base1 - e·point1
  //   a2 = z·base2 - e·point2
  // Break chained expressions so every intermediate WASM allocation is
  // named and can be freed immediately after it is no longer needed.
  const b1z = stmt.base1.mul(proof.z);
  const p1e = stmt.point1.mul(proof.e);
  const a1  = b1z.sub(p1e); // sub() frees its own neg temporary
  b1z.destroyWasm();
  p1e.destroyWasm();

  const b2z = stmt.base2.mul(proof.z);
  const p2e = stmt.point2.mul(proof.e);
  const a2  = b2z.sub(p2e);
  b2z.destroyWasm();
  p2e.destroyWasm();

  bindStatementDLEQ(t, stmt);
  t.appendPoint('dleq:a1', a1);
  t.appendPoint('dleq:a2', a2);
  const ePrime = t.challenge('dleq:e');
  a1.destroyWasm();
  a2.destroyWasm();
  return proof.e === ePrime;
}

function bindStatementDLEQ(t: Transcript, stmt: DLEQStatement): void {
  t.appendPoint('dleq:base1', stmt.base1);
  t.appendPoint('dleq:base2', stmt.base2);
  t.appendPoint('dleq:point1', stmt.point1);
  t.appendPoint('dleq:point2', stmt.point2);
}

// ---------- (B+1)-branch OR (Munich §6.1.1 / §6.2.1) ----------

export interface ORStatement {
  ct: Ciphertext; // (C1, C2)
  mpk: G2Point;
  candidates: readonly bigint[]; // M = {m_0, ..., m_B}; index trueIndex is the real plaintext
}

export interface ORWitness {
  r: bigint; // randomness used in Enc(m_{trueIndex}, mpk, r)
  trueIndex: number;
}

/**
 * Simulated branches pre-sampled by the caller. Length must equal
 * `candidates.length`; entries at `trueIndex` are ignored (we fill in the
 * real branch ourselves). Intended for deterministic test vectors; omit
 * in production.
 */
export interface ORCommitments {
  w?: bigint; // real-branch commitment randomness
  simulated?: readonly ({ e: bigint; z: bigint } | null)[];
}

export function proveOR(
  stmt: ORStatement,
  witness: ORWitness,
  t: Transcript,
  commit: ORCommitments = {},
): ORProof {
  const B1 = stmt.candidates.length;
  if (B1 === 0) throw new Error('proveOR: candidate set is empty');
  if (witness.trueIndex < 0 || witness.trueIndex >= B1) {
    throw new Error('proveOR: trueIndex out of range');
  }

  const P2 = G2Point.generator();
  const { ct, mpk } = stmt;
  const sims = commit.simulated ?? new Array(B1).fill(null);
  if (sims.length !== B1) {
    throw new Error(
      `proveOR: simulated.length (${sims.length}) must equal candidates.length (${B1})`,
    );
  }

  // --- Pass 1: build each branch's (a1,i, a2,i). ---
  const branches: ORProofBranch[] = new Array(B1);
  const eStored: bigint[] = new Array(B1).fill(0n);
  const zStored: bigint[] = new Array(B1).fill(0n);

  let w: bigint | null = null;
  for (let i = 0; i < B1; i++) {
    if (i === witness.trueIndex) {
      // Real branch: commit with fresh w.
      w = commit.w ?? randomScalar();
      const a1 = P2.mul(w);
      const a2 = mpk.mul(w);
      branches[i] = { a1, a2, e: 0n, z: 0n };
    } else {
      // Simulated branch: sample (e_i, z_i), derive commitments.
      // All intermediates are freed immediately after use.
      const sim = sims[i] ?? {
        e: randomScalar(),
        z: randomScalar(),
      };
      const ei = modQ(sim.e);
      const zi = modQ(sim.z);
      const candMul = P2.mul(modQ(stmt.candidates[i]!));
      const Di      = ct.c2.sub(candMul); // sub() frees candMul.neg()
      candMul.destroyWasm();
      // a1,i = z_i·P₂ - e_i·C1
      const P2zi   = P2.mul(zi);
      const c1ei   = ct.c1.mul(ei);
      const a1     = P2zi.sub(c1ei);
      P2zi.destroyWasm();
      c1ei.destroyWasm();
      // a2,i = z_i·mpk - e_i·D_i
      const mpkZi  = mpk.mul(zi);
      const Diei   = Di.mul(ei);
      const a2     = mpkZi.sub(Diei);
      mpkZi.destroyWasm();
      Diei.destroyWasm();
      Di.destroyWasm();
      branches[i] = { a1, a2, e: ei, z: zi };
      eStored[i] = ei;
      zStored[i] = zi;
    }
  }

  // --- Pass 2: compute aggregate challenge and close the real branch. ---
  bindStatementOR(t, stmt);
  for (let i = 0; i < B1; i++) {
    t.appendPoint(`or:a1[${i}]`, branches[i]!.a1);
    t.appendPoint(`or:a2[${i}]`, branches[i]!.a2);
  }
  const e = t.challenge('or:e');

  // e_{i*} := e - Σ_{i ≠ i*} e_i  mod q
  let simSum = 0n;
  for (let i = 0; i < B1; i++) if (i !== witness.trueIndex) simSum += eStored[i]!;
  const eReal = modQ(e - simSum);
  // z_{i*} := w + r · e_{i*}  mod q      [spec writes r·e_{i*} + w; order doesn't matter]
  const zReal = modQ(w! + witness.r * eReal);
  branches[witness.trueIndex] = {
    ...branches[witness.trueIndex]!,
    e: eReal,
    z: zReal,
  };

  P2.destroyWasm();
  return { branches };
}

export function verifyOR(
  stmt: ORStatement,
  proof: ORProof,
  t: Transcript,
): boolean {
  const B1 = stmt.candidates.length;
  if (proof.branches.length !== B1) return false;

  const P2 = G2Point.generator();
  const { ct, mpk } = stmt;

  // 1. Each branch's DLEQ equations must hold with its own (a1,i, a2,i, e_i, z_i).
  //      z_i·P₂ = a1,i + e_i·C1
  //      z_i·mpk = a2,i + e_i·(C2 - m_i·P₂)
  // Every intermediate G2 point is explicitly freed after use so they
  // do not accumulate on the fixed 16 MB WASM heap across many calls.
  for (let i = 0; i < B1; i++) {
    const br = proof.branches[i]!;

    const lhs1   = P2.mul(br.z);
    const c1e    = ct.c1.mul(br.e);
    const rhs1   = br.a1.add(c1e);
    c1e.destroyWasm();
    const eq1    = lhs1.equals(rhs1);
    lhs1.destroyWasm();
    rhs1.destroyWasm();
    if (!eq1) { P2.destroyWasm(); return false; }

    const candMul = P2.mul(modQ(stmt.candidates[i]!));
    const Di      = ct.c2.sub(candMul); // sub() frees candMul.neg() internally
    candMul.destroyWasm();

    const lhs2   = mpk.mul(br.z);
    const DiMulE = Di.mul(br.e);
    const rhs2   = br.a2.add(DiMulE);
    Di.destroyWasm();
    DiMulE.destroyWasm();
    const eq2    = lhs2.equals(rhs2);
    lhs2.destroyWasm();
    rhs2.destroyWasm();
    if (!eq2) { P2.destroyWasm(); return false; }
  }

  // 2. Recompute the aggregate challenge with identical transcript binding.
  bindStatementOR(t, stmt);
  for (let i = 0; i < B1; i++) {
    t.appendPoint(`or:a1[${i}]`, proof.branches[i]!.a1);
    t.appendPoint(`or:a2[${i}]`, proof.branches[i]!.a2);
  }
  const ePrime = t.challenge('or:e');

  P2.destroyWasm();

  // 3. Σ e_i ≡ e' (mod q).
  let sum = 0n;
  for (const br of proof.branches) sum += br.e;
  return modQ(sum) === ePrime;
}

function bindStatementOR(t: Transcript, stmt: ORStatement): void {
  const P2 = G2Point.generator();
  t.appendPoint('or:P2', P2);
  P2.destroyWasm();
  t.appendPoint('or:mpk', stmt.mpk);
  t.appendPoint('or:C1', stmt.ct.c1);
  t.appendPoint('or:C2', stmt.ct.c2);
  t.append('or:|M|', u32BytesBE(stmt.candidates.length));
  for (let i = 0; i < stmt.candidates.length; i++) {
    t.appendScalar(`or:m[${i}]`, modQ(stmt.candidates[i]!));
  }
}

function u32BytesBE(n: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = (n >>> 24) & 0xff;
  out[1] = (n >>> 16) & 0xff;
  out[2] = (n >>> 8) & 0xff;
  out[3] = n & 0xff;
  return out;
}

// ---------- Budget proof (Munich §6.1.3 / §6.2.2) ----------

/**
 * Statement for both exact- and at-most-budget proofs. The prover and
 * verifier agree on `(ctSum, mpk, budget)`; the discriminator lives on the
 * proof (not the statement) because the verifier typically learns it by
 * reading the wire-format tag byte.
 */
export interface BudgetStatement {
  ctSum: Ciphertext; // homomorphic sum Σ_j c_j (Variant A) or Σ_j Σ_k 2^k c_{j,k} (Variant B)
  mpk: G2Point;
  budget: bigint; // B ∈ ℕ, expected non-negative and ≪ Q
}

/** Witness for exact-budget: V = B, so only rΣ is needed. */
export interface ExactBudgetWitness {
  rSum: bigint; // = Σ_j r_j (Variant A) or Σ_j Σ_k 2^k r_{j,k} (Variant B)
}

/**
 * Witness for at-most-budget: V ∈ {0, …, B}. The prover must additionally
 * tell us the actual plaintext sum V so we can pick the true branch; V is
 * not on the wire, so revealing it to this function does not leak privacy.
 */
export interface AtMostBudgetWitness {
  rSum: bigint;
  V: bigint; // actual plaintext sum, ∈ [0, B]
}

/**
 * Prove `cΣ = Enc(B, mpk, rΣ)` — i.e. V ≡ B. Thin wrapper over `proveDLEQ`
 * on the canonical same-log instance `point1 = cΣ.c1 = rΣ·P₂`,
 * `point2 = cΣ.c2 − B·P₂ = rΣ·mpk`.
 */
export function proveBudgetExact(
  stmt: BudgetStatement,
  witness: ExactBudgetWitness,
  t: Transcript,
  commit: { w?: bigint } = {},
): BudgetProof {
  bindBudget(t, stmt, 'exact');
  const dleqStmt = budgetDLEQInstance(stmt);
  const proof    = proveDLEQ(dleqStmt, { x: witness.rSum }, t, commit);
  dleqStmt.base1.destroyWasm();
  dleqStmt.point2.destroyWasm();
  return { mode: 'exact', proof };
}

export function verifyBudgetExact(
  stmt: BudgetStatement,
  proof: DLEQProof,
  t: Transcript,
): boolean {
  bindBudget(t, stmt, 'exact');
  // Inline the DLEQ instance so we can free P2 and D immediately after use.
  const P2         = G2Point.generator();
  const budgetMul  = P2.mul(modQ(stmt.budget));
  const D          = stmt.ctSum.c2.sub(budgetMul); // sub() frees budgetMul.neg()
  budgetMul.destroyWasm();
  const dleqStmt: DLEQStatement = {
    base1: P2, point1: stmt.ctSum.c1,
    base2: stmt.mpk, point2: D,
  };
  const result = verifyDLEQ(dleqStmt, proof, t);
  P2.destroyWasm();
  D.destroyWasm();
  return result;
}

/**
 * Prove `V ∈ {0, …, B}` — i.e. V ≤ B. Thin wrapper over `proveOR` with
 * candidates `{0, 1, …, B}` and `trueIndex = Number(V)`.
 */
export function proveBudgetAtMost(
  stmt: BudgetStatement,
  witness: AtMostBudgetWitness,
  t: Transcript,
  commit: ORCommitments = {},
): BudgetProof {
  if (stmt.budget < 0n) {
    throw new Error(`proveBudgetAtMost: budget (${stmt.budget}) must be non-negative`);
  }
  if (witness.V < 0n || witness.V > stmt.budget) {
    throw new Error(
      `proveBudgetAtMost: V (${witness.V}) must be in [0, ${stmt.budget}]`,
    );
  }
  bindBudget(t, stmt, 'atMost');
  const proof = proveOR(
    budgetORInstance(stmt),
    { r: witness.rSum, trueIndex: Number(witness.V) },
    t,
    commit,
  );
  return { mode: 'atMost', proof };
}

export function verifyBudgetAtMost(
  stmt: BudgetStatement,
  proof: ORProof,
  t: Transcript,
): boolean {
  if (stmt.budget < 0n) return false;
  bindBudget(t, stmt, 'atMost');
  return verifyOR(budgetORInstance(stmt), proof, t);
}

/**
 * Dispatcher that mirrors the wire-format tag byte (0x00 = exact, 0x01 =
 * atMost). Convenient for verifiers that parse a `BudgetProof` off the
 * wire and don't want to branch on `proof.mode` themselves.
 */
export function verifyBudget(
  stmt: BudgetStatement,
  proof: BudgetProof,
  t: Transcript,
): boolean {
  return proof.mode === 'exact'
    ? verifyBudgetExact(stmt, proof.proof, t)
    : verifyBudgetAtMost(stmt, proof.proof, t);
}

function budgetDLEQInstance(stmt: BudgetStatement): DLEQStatement {
  const P2     = G2Point.generator();
  const budMul = P2.mul(modQ(stmt.budget));
  const D      = stmt.ctSum.c2.sub(budMul); // sub() frees budMul.neg()
  budMul.destroyWasm();
  return { base1: P2, point1: stmt.ctSum.c1, base2: stmt.mpk, point2: D };
}

function budgetORInstance(stmt: BudgetStatement): ORStatement {
  const B = Number(stmt.budget);
  const candidates: bigint[] = new Array(B + 1);
  for (let i = 0; i <= B; i++) candidates[i] = BigInt(i);
  return { ct: stmt.ctSum, mpk: stmt.mpk, candidates };
}

function bindBudget(
  t: Transcript,
  stmt: BudgetStatement,
  mode: 'exact' | 'atMost',
): void {
  // 0x00 = exact, 0x01 = atMost — matches the wire-format tag in §5 of the
  // dev plan so the transcript binding and the serialised form stay in
  // lock-step.
  t.append('budget:mode', new Uint8Array([mode === 'exact' ? 0x00 : 0x01]));
  t.appendScalar('budget:B', modQ(stmt.budget));
}

