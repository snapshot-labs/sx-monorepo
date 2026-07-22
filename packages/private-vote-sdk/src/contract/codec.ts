/**
 * Wire codec for the single opaque `bytes` field the on-chain contract does
 * not prescribe: the voter's `zkProof`. Also ships small codecs for the two
 * other raw-byte fields the SDK produces — `SchnorrSig` (voter signature)
 * and `DLEQProof` (keyper decryption share proof) — because their formats
 * are similarly SDK-owned. Every other struct on the contract wire
 * (`Ballot`, `ElectionConfig`, `DecryptionShare`, …) is owned by the
 * consumer via their ABI layer (see D-5).
 *
 * Variant A and Variant B share the same envelope — only `n_outer` and
 * per-outer `branch_count` change.
 *
 * Wire layout:
 *
 *   [0]       version      u8 (0x01)
 *   [1]       variant      u8 (0x41 'A' / 0x42 'B')
 *   [2..3]    n_outer      u16 BE      // Variant A: ℓ; Variant B: ℓ·d
 *   [4..]     branch_count u16 BE per outer i
 *                                      // Variant A: B+1; Variant B: 2
 *   [...]     or_proofs    n_outer × branch_count × BRANCH_SIZE bytes,
 *                          each branch = a1(96) ‖ a2(96) ‖ e(32) ‖ z(32)
 *   [...]     budget_tag   u8 (0x00 exact, 0x01 atMost)
 *   [...]     budget       exact: 64 bytes DLEQ (e ‖ z); atMost: (B+1) branches as above
 *
 * Sizes are deterministic given (variant, ℓ, B, d) — the decoder requires
 * the caller to pass those in so decode-time doesn't need length prefixes
 * per sub-object. The version byte stays as the one compatibility hook.
 */

import { G1_BYTES, G1Point, G2_BYTES, G2Point } from '../crypto/curve';
import { SCALAR_BYTES, scalarFromBytes, scalarToBytes } from '../crypto/field';
import type {
  BallotValidityProof,
  BudgetProof,
  DLEQProof,
  ORProof,
  ORProofBranch,
  SchnorrSig
} from '../voting/types';

// ---------- Wire constants ----------

/** @public wire-format version byte */
export const BVP_VERSION = 0x01;
const VARIANT_A_BYTE = 0x41;
const VARIANT_B_BYTE = 0x42;
const BUDGET_EXACT = 0x00;
const BUDGET_ATMOST = 0x01;

const BRANCH_SIZE = 2 * G2_BYTES + 2 * SCALAR_BYTES; // 96+96+32+32 = 256
const DLEQ_BYTES = 2 * SCALAR_BYTES; // 64
/** @public */
export const SCHNORR_BYTES = G1_BYTES + SCALAR_BYTES; // 48 + 32 = 80

export interface DecodeParams {
  variant: 'A' | 'B';
  numCandidates: number; // ℓ
  budget: number; // B
  d?: number; // Variant B only
}

// ---------- ORProof ----------

function encodeBranch(
  br: ORProofBranch,
  out: Uint8Array,
  offset: number
): number {
  out.set(br.a1.toBytes(), offset);
  offset += G2_BYTES;
  out.set(br.a2.toBytes(), offset);
  offset += G2_BYTES;
  out.set(scalarToBytes(br.e), offset);
  offset += SCALAR_BYTES;
  out.set(scalarToBytes(br.z), offset);
  return offset + SCALAR_BYTES;
}

function decodeBranch(
  buf: Uint8Array,
  offset: number
): { br: ORProofBranch; next: number } {
  const a1 = G2Point.fromBytes(buf.subarray(offset, offset + G2_BYTES));
  offset += G2_BYTES;
  const a2 = G2Point.fromBytes(buf.subarray(offset, offset + G2_BYTES));
  offset += G2_BYTES;
  const e = scalarFromBytes(buf.subarray(offset, offset + SCALAR_BYTES));
  offset += SCALAR_BYTES;
  const z = scalarFromBytes(buf.subarray(offset, offset + SCALAR_BYTES));
  return { br: { a1, a2, e, z }, next: offset + SCALAR_BYTES };
}

function orProofSize(branchCount: number): number {
  return branchCount * BRANCH_SIZE;
}

function encodeOR(p: ORProof, out: Uint8Array, offset: number): number {
  for (const br of p.branches) offset = encodeBranch(br, out, offset);
  return offset;
}

function decodeOR(
  buf: Uint8Array,
  offset: number,
  branchCount: number
): { proof: ORProof; next: number } {
  const branches: ORProofBranch[] = new Array(branchCount);
  for (let i = 0; i < branchCount; i++) {
    const { br, next } = decodeBranch(buf, offset);
    branches[i] = br;
    offset = next;
  }
  return { proof: { branches }, next: offset };
}

// ---------- DLEQ ----------

export function encodeDLEQ(p: DLEQProof): Uint8Array {
  const out = new Uint8Array(DLEQ_BYTES);
  out.set(scalarToBytes(p.e), 0);
  out.set(scalarToBytes(p.z), SCALAR_BYTES);
  return out;
}

export function decodeDLEQ(b: Uint8Array): DLEQProof {
  if (b.length !== DLEQ_BYTES) {
    throw new Error(
      `decodeDLEQ: expected ${DLEQ_BYTES} bytes, got ${b.length}`
    );
  }
  return {
    e: scalarFromBytes(b.subarray(0, SCALAR_BYTES)),
    z: scalarFromBytes(b.subarray(SCALAR_BYTES, DLEQ_BYTES))
  };
}

// ---------- Schnorr ----------

export function encodeSchnorr(sig: SchnorrSig): Uint8Array {
  const out = new Uint8Array(SCHNORR_BYTES);
  out.set(sig.R.toBytes(), 0);
  out.set(scalarToBytes(sig.s), G1_BYTES);
  return out;
}

export function decodeSchnorr(b: Uint8Array): SchnorrSig {
  if (b.length !== SCHNORR_BYTES) {
    throw new Error(
      `decodeSchnorr: expected ${SCHNORR_BYTES} bytes, got ${b.length}`
    );
  }
  return {
    R: G1Point.fromBytes(b.subarray(0, G1_BYTES)),
    s: scalarFromBytes(b.subarray(G1_BYTES, SCHNORR_BYTES))
  };
}

// ---------- BallotValidityProof ----------

function rangeBranchCount(params: DecodeParams): number {
  // Variant A: each range proof has B+1 branches over {0,…,B}.
  // Variant B: each bit proof has 2 branches over {0,1}.
  return params.variant === 'A' ? params.budget + 1 : 2;
}

function outerCount(params: DecodeParams): number {
  if (params.variant === 'A') return params.numCandidates;
  if (params.d === undefined) {
    throw new Error('Variant B requires d');
  }
  return params.numCandidates * params.d;
}

export function encodeBallotValidityProof(p: BallotValidityProof): Uint8Array {
  if (p.version !== BVP_VERSION) {
    throw new Error(
      `encodeBallotValidityProof: unsupported version ${p.version}`
    );
  }
  if (p.variant !== 'A' && p.variant !== 'B') {
    throw new Error(`encodeBallotValidityProof: unknown variant ${p.variant}`);
  }

  const nOuter = p.rangeOrBit.length;
  // Every outer proof must have the same branch count in the shipped
  // variants — no forward-compat wobble.
  const branchCount = p.rangeOrBit[0]?.branches.length ?? 0;
  for (let i = 0; i < nOuter; i++) {
    if (p.rangeOrBit[i]!.branches.length !== branchCount) {
      throw new Error(
        `encodeBallotValidityProof: rangeOrBit[${i}].branches.length diverges (${p.rangeOrBit[i]!.branches.length} vs ${branchCount})`
      );
    }
  }

  const headerSize = 4 + 2 * nOuter;
  const orSize = nOuter * orProofSize(branchCount);
  const budgetHeader = 1;
  let budgetSize: number;
  if (p.budget.mode === 'exact') {
    budgetSize = DLEQ_BYTES;
  } else {
    budgetSize = orProofSize(p.budget.proof.branches.length);
  }
  const total = headerSize + orSize + budgetHeader + budgetSize;
  const out = new Uint8Array(total);

  let offset = 0;
  out[offset++] = BVP_VERSION;
  out[offset++] = p.variant === 'A' ? VARIANT_A_BYTE : VARIANT_B_BYTE;
  writeU16BE(out, offset, nOuter);
  offset += 2;
  for (let i = 0; i < nOuter; i++) {
    writeU16BE(out, offset, branchCount);
    offset += 2;
  }
  for (let i = 0; i < nOuter; i++) {
    offset = encodeOR(p.rangeOrBit[i]!, out, offset);
  }
  out[offset++] = p.budget.mode === 'exact' ? BUDGET_EXACT : BUDGET_ATMOST;
  if (p.budget.mode === 'exact') {
    out.set(encodeDLEQ(p.budget.proof), offset);
    offset += DLEQ_BYTES;
  } else {
    offset = encodeOR(p.budget.proof, out, offset);
  }

  if (offset !== total) {
    throw new Error(
      `encodeBallotValidityProof: offset ${offset} != predicted total ${total}`
    );
  }
  return out;
}

export function decodeBallotValidityProof(
  buf: Uint8Array,
  params: DecodeParams
): BallotValidityProof {
  if (params.variant === 'B' && (params.d === undefined || params.d <= 0)) {
    throw new Error(
      'decodeBallotValidityProof: Variant B requires a positive d'
    );
  }

  let offset = 0;
  if (buf.length < 4)
    throw new Error('decodeBallotValidityProof: buffer too short');
  const version = buf[offset++]!;
  if (version !== BVP_VERSION) {
    throw new Error(
      `decodeBallotValidityProof: unsupported version ${version}`
    );
  }
  const variantByte = buf[offset++]!;
  const variant =
    variantByte === VARIANT_A_BYTE
      ? 'A'
      : variantByte === VARIANT_B_BYTE
        ? 'B'
        : null;
  if (variant === null) {
    throw new Error(
      `decodeBallotValidityProof: unknown variant byte 0x${variantByte.toString(16)}`
    );
  }
  if (variant !== params.variant) {
    throw new Error(
      `decodeBallotValidityProof: variant on wire (${variant}) differs from params (${params.variant})`
    );
  }

  const nOuterExpected = outerCount(params);
  const nOuter = readU16BE(buf, offset);
  offset += 2;
  if (nOuter !== nOuterExpected) {
    throw new Error(
      `decodeBallotValidityProof: n_outer on wire (${nOuter}) differs from expected (${nOuterExpected})`
    );
  }

  const branchCountExpected = rangeBranchCount(params);
  const branchCounts: number[] = new Array(nOuter);
  for (let i = 0; i < nOuter; i++) {
    const bc = readU16BE(buf, offset);
    offset += 2;
    if (bc !== branchCountExpected) {
      throw new Error(
        `decodeBallotValidityProof: branch_count[${i}] on wire (${bc}) differs from expected (${branchCountExpected})`
      );
    }
    branchCounts[i] = bc;
  }

  const rangeOrBit: ORProof[] = new Array(nOuter);
  for (let i = 0; i < nOuter; i++) {
    const { proof, next } = decodeOR(buf, offset, branchCounts[i]!);
    rangeOrBit[i] = proof;
    offset = next;
  }

  if (offset >= buf.length) {
    throw new Error('decodeBallotValidityProof: truncated before budget tag');
  }
  const budgetTag = buf[offset++]!;
  let budget: BudgetProof;
  if (budgetTag === BUDGET_EXACT) {
    const sub = buf.subarray(offset, offset + DLEQ_BYTES);
    if (sub.length !== DLEQ_BYTES) {
      throw new Error('decodeBallotValidityProof: truncated exact-budget DLEQ');
    }
    budget = { mode: 'exact', proof: decodeDLEQ(sub) };
    offset += DLEQ_BYTES;
  } else if (budgetTag === BUDGET_ATMOST) {
    const { proof, next } = decodeOR(buf, offset, params.budget + 1);
    budget = { mode: 'atMost', proof };
    offset = next;
  } else {
    throw new Error(
      `decodeBallotValidityProof: unknown budget tag 0x${budgetTag.toString(16)}`
    );
  }

  if (offset !== buf.length) {
    throw new Error(
      `decodeBallotValidityProof: ${buf.length - offset} trailing bytes after parse`
    );
  }

  return { version, variant, rangeOrBit, budget };
}

// ---------- u16 helpers ----------

function writeU16BE(out: Uint8Array, offset: number, n: number): void {
  if (n < 0 || n > 0xffff) throw new Error(`u16 out of range: ${n}`);
  out[offset] = (n >>> 8) & 0xff;
  out[offset + 1] = n & 0xff;
}

function readU16BE(buf: Uint8Array, offset: number): number {
  if (offset + 2 > buf.length) throw new Error('readU16BE: out of bounds');
  return (buf[offset]! << 8) | buf[offset + 1]!;
}
