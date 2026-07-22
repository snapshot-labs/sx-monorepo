/**
 * JSON schema and (de)serialisation helpers for the cross-implementation
 * test vectors under `tests/vectors/`. These types are deliberately
 * minimal and self-describing: every curve point is a hex string of
 * compressed BLS12-381 bytes, every scalar is a decimal-digit bigint
 * string, and every byte blob (zkProof, signature) is a hex string.
 *
 * An independent re-verifier in Rust / Go / another language reads the
 * same JSON and checks the `expected` field against its own `verify*`
 * output — that's the point of vectoring the SDK's behaviour on disk.
 */
import {
  BallotValidityProof,
  DLEQProof,
  G1Point,
  G2Point,
  ORProof,
  SchnorrSig,
  decodeDLEQ,
  encodeBallotValidityProof,
  encodeDLEQ,
} from '../../src';
import { decodeBallotValidityProof } from '../../src/contract/codec';

export const VECTOR_VERSION = 1;

export function bytesToHex(b: Uint8Array): string {
  return Buffer.from(b).toString('hex');
}

export function hexToBytes(h: string): Uint8Array {
  return new Uint8Array(Buffer.from(h, 'hex'));
}

export function scalarToDec(s: bigint): string {
  return s.toString(10);
}

export function decToScalar(s: string): bigint {
  return BigInt(s);
}

export function g1ToHex(p: G1Point): string {
  return bytesToHex(p.toBytes());
}

export function g1FromHex(h: string): G1Point {
  return G1Point.fromBytes(hexToBytes(h));
}

export function g2ToHex(p: G2Point): string {
  return bytesToHex(p.toBytes());
}

export function g2FromHex(h: string): G2Point {
  return G2Point.fromBytes(hexToBytes(h));
}

// ---------- Per-category vector shapes ----------

export type EncryptVector = {
  name: string;
  description: string;
  version: number;
  inputs: {
    mpk: string; // G2 hex
    m: string; // bigint decimal
    r: string; // bigint decimal
  };
  expected: {
    c1: string; // G2 hex
    c2: string; // G2 hex
  };
};

export type DLEQVector = {
  name: string;
  description: string;
  version: number;
  inputs: {
    base1: string; // G2 hex
    base2: string; // G2 hex
    point1: string; // G2 hex
    point2: string; // G2 hex
    transcript_label: string; // seed label for Transcript
    proof: string; // hex of encodeDLEQ
  };
  expected: {
    verify: boolean;
  };
};

export type ORVector = {
  name: string;
  description: string;
  version: number;
  inputs: {
    mpk: string; // G2 hex
    ct: { c1: string; c2: string };
    candidates: string[]; // decimal scalars
    transcript_label: string;
    // OR proof serialised as: (B+1) branches of {a1, a2, e, z} and
    // top-level `e` + `z` ordering matches proveOR's internal layout.
    or_proof_encoded: string; // see README
  };
  expected: {
    verify: boolean;
  };
};

export type BudgetVector = {
  name: string;
  description: string;
  version: number;
  inputs: {
    mpk: string;
    mode: 'exact' | 'atMost';
    budget: number;
    // sum ciphertext of all candidate ciphertexts
    ct_sum: { c1: string; c2: string };
    transcript_label: string;
    // For 'exact': `{ dleq_proof: hex }` (the canonical DLEQ encoding).
    // For 'atMost': `{ or_proof_encoded: hex }` (OR proof encoding).
    proof_encoded: string;
  };
  expected: {
    verify: boolean;
  };
};

export type SchnorrVector = {
  name: string;
  description: string;
  version: number;
  inputs: {
    vk: string; // G1 hex
    message: string; // hex bytes
    sig: string; // hex of encodeSchnorr
  };
  expected: {
    verify: boolean;
  };
};

export type DecryptShareVector = {
  name: string;
  description: string;
  version: number;
  inputs: {
    ct_sum: { c1: string; c2: string };
    committee_pk: string; // G2 hex (mpk_k)
    keyper_index: number; // 1..n
    transcript_label: string;
    share: {
      keyper_index: number;
      sigma: string; // G2 hex
      dleq_proof: string; // hex
    };
  };
  expected: {
    verify: boolean;
  };
};

export type BallotVector = {
  name: string;
  description: string;
  version: number;
  inputs: {
    mpk: string;
    vk: string;
    election_id: string; // hex 32B
    pseudonym: string; // hex 32B
    params: {
      numCandidates: number;
      budget: number;
      mode: 'exact' | 'atMost';
      variant: 'A' | 'B';
      d?: number;
    };
    ciphertexts: Array<{ c1: string; c2: string }>;
    zkProof: string; // hex of encodeBallotValidityProof
    signature: string; // hex of encodeSchnorr
    wr_attestation: string; // hex bytes (SDK treats as opaque)
  };
  expected: {
    verify: boolean;
    reason?: string;
  };
};

export type TallyVector = {
  name: string;
  description: string;
  version: number;
  inputs: {
    ct_sum: { c1: string; c2: string };
    committee_pks: string[]; // G2 hex per keyper
    alphas: string[]; // decimal scalars for the t+1 subset, matching shares order
    upper_bound: string; // decimal scalar: p × B, for BSGS table
    shares: Array<{
      keyper_index: number;
      sigma: string;
      dleq_proof: string;
    }>;
  };
  expected: {
    V: string; // decimal — the recovered tally
  };
};

// ---------- OR proof canonical (de)serialisation ----------
//
// The on-wire zkProof bundles the OR proof via `encodeBallotValidityProof`,
// but the OR primitive vectors want to isolate one OR proof without the
// surrounding ballot envelope. We use a fixed, ciphertext-agnostic
// encoding here: 2B branch count, then per branch: 96B a1 ‖ 96B a2 ‖ 32B e
// (big-endian) ‖ 32B z (big-endian).
//
// Consumers (including the external re-verifier) can decode this back
// into an `ORProof` and run `verifyOR` directly.

const OR_BRANCH_BYTES = 96 + 96 + 32 + 32;

export function encodeORProof(proof: ORProof): Uint8Array {
  const B1 = proof.branches.length;
  const out = new Uint8Array(2 + B1 * OR_BRANCH_BYTES);
  out[0] = (B1 >> 8) & 0xff;
  out[1] = B1 & 0xff;
  let off = 2;
  for (const b of proof.branches) {
    out.set(b.a1.toBytes(), off);
    off += 96;
    out.set(b.a2.toBytes(), off);
    off += 96;
    out.set(bigIntToBytesBE32(b.e), off);
    off += 32;
    out.set(bigIntToBytesBE32(b.z), off);
    off += 32;
  }
  return out;
}

export function decodeORProof(bytes: Uint8Array): ORProof {
  if (bytes.length < 2) throw new Error('decodeORProof: too short');
  const B1 = (bytes[0]! << 8) | bytes[1]!;
  if (bytes.length !== 2 + B1 * OR_BRANCH_BYTES) {
    throw new Error(
      `decodeORProof: expected ${2 + B1 * OR_BRANCH_BYTES} bytes, got ${bytes.length}`,
    );
  }
  const branches: ORProof['branches'] = new Array(B1);
  let off = 2;
  for (let i = 0; i < B1; i++) {
    const a1 = G2Point.fromBytes(bytes.subarray(off, off + 96));
    off += 96;
    const a2 = G2Point.fromBytes(bytes.subarray(off, off + 96));
    off += 96;
    const e = bytesBEToBigInt(bytes.subarray(off, off + 32));
    off += 32;
    const z = bytesBEToBigInt(bytes.subarray(off, off + 32));
    off += 32;
    branches[i] = { a1, a2, e, z };
  }
  return { branches };
}

function bigIntToBytesBE32(x: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = x;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

function bytesBEToBigInt(b: Uint8Array): bigint {
  let v = 0n;
  for (const byte of b) v = (v << 8n) | BigInt(byte);
  return v;
}

// ---------- Convenience (re-)exports ----------

export {
  encodeBallotValidityProof,
  decodeBallotValidityProof,
  encodeDLEQ,
  decodeDLEQ,
};
export type { BallotValidityProof, DLEQProof, SchnorrSig };
