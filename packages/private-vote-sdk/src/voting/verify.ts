/**
 * Ballot-level verification (Munich spec §6 composition).
 *
 * `verifyBallot` composes the pieces built in P1–P3b: decodes the opaque
 * `zkProof` bytes, runs each candidate's range proof, homomorphically sums
 * the ciphertexts, runs the budget proof on the sum, and checks the
 * voter's Schnorr signature over a canonical preimage.
 *
 * `canonicalBallotMessage` is the single source of truth for what bytes the
 * voter actually signs; both the frontend signer and any verifier (Vote
 * Proxy, auditor) must call this function rather than assembling the
 * preimage themselves, because any drift breaks every ballot.
 *
 * Per deviation D-5, nothing in this file references contract-struct
 * types. Callers destructure their own `Ballot` into the primitive-typed
 * `BallotInputs` shape and pass it in.
 */

import { keccak256 } from 'viem';

import {
  G1Point,
  G2Point,
} from '../crypto/curve';
import {
  decodeBallotValidityProof,
  decodeSchnorr,
} from '../contract/codec';
import { addCt, scalarMulCt, sumCts } from './encrypt';
import {
  type ORStatement,
  verifyBudget,
  verifyOR,
} from './proofs';
import { schnorrVerify } from './schnorr';
import { Transcript } from './transcript';
import type {
  BallotValidityProof,
  Ciphertext,
} from './types';

const encoder = new TextEncoder();

const BALLOT_LABEL = 'SHUTTER-VOTE-BALLOT-v1';
const CANONICAL_HEADER = encoder.encode(BALLOT_LABEL);

// ---------- Public input shapes ----------

/**
 * Primitive-typed ballot inputs — the caller's `Ballot` struct destructured
 * into raw bytes. The SDK does not know about contract-struct types, so
 * every point / signature / attestation is passed as its on-wire byte
 * string and decoded internally.
 */
export interface BallotInputs {
  electionId: Uint8Array; // bytes32
  pseudonym: Uint8Array; // bytes32 nym_i
  vk: Uint8Array; // 48-byte compressed G₁
  ciphertexts: ReadonlyArray<readonly [Uint8Array, Uint8Array]>; // (C1, C2) pairs, each 96 bytes compressed G₂
  zkProof: Uint8Array; // output of encodeBallotValidityProof
  voterSignature: Uint8Array; // encodeSchnorr(sig) — 80 bytes
  wrAttestation: Uint8Array; // opaque σ_WR — handed to the caller-supplied verifier
}

/**
 * Election-side parameters the ballot verifier needs. A subset of the
 * consumer's `ElectionConfig` — only the fields that actually feed into
 * ballot verification appear here, so the SDK never sees
 * `phaseDeadlines` / `keyperAddresses` / etc.
 */
export interface BallotVerifyParams {
  numCandidates: number; // ℓ
  budget: number; // B
  mode: 'exact' | 'atMost';
  variant: 'A' | 'B';
  d?: number; // Variant B only
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Signature of the WR-Server attestation verifier. Out of SDK scope (the
 * WR-Server signature scheme is specified outside this spec), so the
 * caller supplies a closure. The SDK invokes it with everything the
 * attestation binds to in the voter-registration flow.
 */
export type WRAttestationVerifier = (
  electionId: Uint8Array,
  pseudonym: Uint8Array,
  vk: Uint8Array,
  attestation: Uint8Array,
) => boolean;

// ---------- Canonical Schnorr preimage ----------

/**
 * Deterministic preimage for the voter's Schnorr signature. Both the
 * frontend (when signing) and any verifier (Vote Proxy, auditor) MUST
 * call this function rather than reconstructing the concatenation
 * manually — any drift in byte ordering or length prefixes silently
 * invalidates every ballot.
 *
 * Layout:
 *   "SHUTTER-VOTE-BALLOT-v1" ‖ electionId ‖ pseudonym
 *     ‖ u16 BE ciphertexts.length
 *     ‖ for each (C1, C2): C1 bytes ‖ C2 bytes      // already 96-byte compressed
 *     ‖ u32 BE zkProof.length ‖ zkProof
 *
 * The caller hashes the returned preimage (keccak256) before handing it
 * to `schnorrSign` / `schnorrVerify`.
 */
export function canonicalBallotMessage(args: {
  electionId: Uint8Array;
  pseudonym: Uint8Array;
  ciphertexts: ReadonlyArray<readonly [Uint8Array, Uint8Array]>;
  zkProof: Uint8Array;
}): Uint8Array {
  if (args.electionId.length !== 32) {
    throw new Error(
      `canonicalBallotMessage: electionId must be exactly 32 bytes (got ${args.electionId.length})`,
    );
  }
  if (args.pseudonym.length !== 32) {
    throw new Error(
      `canonicalBallotMessage: pseudonym must be exactly 32 bytes (got ${args.pseudonym.length})`,
    );
  }
  for (const [c1, c2] of args.ciphertexts) {
    if (c1.length !== 96 || c2.length !== 96) {
      throw new Error('canonicalBallotMessage: each ciphertext component must be 96 bytes');
    }
  }
  const n = args.ciphertexts.length;
  const size =
    CANONICAL_HEADER.length +
    args.electionId.length +
    args.pseudonym.length +
    2 +
    n * (96 + 96) +
    4 +
    args.zkProof.length;
  const out = new Uint8Array(size);
  let o = 0;
  out.set(CANONICAL_HEADER, o);
  o += CANONICAL_HEADER.length;
  out.set(args.electionId, o);
  o += args.electionId.length;
  out.set(args.pseudonym, o);
  o += args.pseudonym.length;
  out[o++] = (n >>> 8) & 0xff;
  out[o++] = n & 0xff;
  for (const [c1, c2] of args.ciphertexts) {
    out.set(c1, o);
    o += 96;
    out.set(c2, o);
    o += 96;
  }
  const zpLen = args.zkProof.length;
  out[o++] = (zpLen >>> 24) & 0xff;
  out[o++] = (zpLen >>> 16) & 0xff;
  out[o++] = (zpLen >>> 8) & 0xff;
  out[o++] = zpLen & 0xff;
  out.set(args.zkProof, o);
  return out;
}

// ---------- Transcript seeding (shared between prover and verifier) ----------

/**
 * Seed a ballot-level Fiat–Shamir transcript with every public input
 * that binds the subsequent range / budget proofs. The prover and the
 * verifier MUST build this transcript identically — in particular, the
 * proof's soundness depends on `vk` being one of the bound values, which
 * is how a ballot produced for voter V1 is prevented from being
 * replayed under V2's `vk` (Munich §7.1 privacy argument).
 *
 * Variant / mode / numCandidates / budget are bound so a prover cannot
 * silently switch ballot shapes between the claimed and verified
 * parameters.
 */
export function seedBallotTranscript(
  electionId: Uint8Array,
  mpk: G2Point,
  vk: G1Point,
  ciphertexts: readonly Ciphertext[],
  params: BallotVerifyParams,
): Transcript {
  const t = new Transcript(BALLOT_LABEL);
  t.append('electionId', electionId);
  t.appendPoint('mpk', mpk);
  t.appendPoint('vk', vk);
  t.append('variant', new Uint8Array([params.variant === 'A' ? 0x41 : 0x42]));
  t.append('mode', new Uint8Array([params.mode === 'exact' ? 0x00 : 0x01]));
  t.append('numCandidates', u16BE(params.numCandidates));
  t.append('budget', u16BE(params.budget));
  if (params.variant === 'B') {
    if (params.d === undefined) {
      throw new Error('seedBallotTranscript: Variant B requires params.d');
    }
    t.append('d', u16BE(params.d));
  }
  t.append('|cts|', u16BE(ciphertexts.length));
  for (let i = 0; i < ciphertexts.length; i++) {
    t.appendPoint(`ct.c1[${i}]`, ciphertexts[i]!.c1);
    t.appendPoint(`ct.c2[${i}]`, ciphertexts[i]!.c2);
  }
  return t;
}

/** Candidate set used by a Variant A range proof for a given budget. */
export function rangeCandidates(budget: number): bigint[] {
  const out: bigint[] = new Array(budget + 1);
  for (let i = 0; i <= budget; i++) out[i] = BigInt(i);
  return out;
}

// ---------- verifyBallot ----------

export function verifyBallot(
  inputs: BallotInputs,
  params: BallotVerifyParams,
  mpk: G2Point,
  verifyWRAttestation: WRAttestationVerifier,
): VerifyResult {
  // Parameter validation. The codec serialises ℓ and B as u16BE, so 0xFFFF
  // is the natural hard ceiling. Anything larger could not round-trip the
  // wire anyway; bounding here turns oversized params into a clean
  // VerifyResult instead of an allocation blow-up on rangeCandidates()/
  // ciphertext loops.
  if (!Number.isInteger(params.numCandidates)) {
    return { ok: false, reason: 'numCandidates must be an integer' };
  }
  if (params.numCandidates < 1 || params.numCandidates > 0xffff) {
    return { ok: false, reason: `numCandidates (${params.numCandidates}) out of range [1, 65535]` };
  }
  if (!Number.isInteger(params.budget)) {
    return { ok: false, reason: 'budget must be an integer' };
  }
  // Munich spec requires B ≥ 1; "budget 0" would collapse the ballot to
  // all-zero votes and reduce the budget proof to proving a tautology.
  if (params.budget < 1 || params.budget > 0xffff) {
    return { ok: false, reason: `budget (${params.budget}) out of range [1, 65535]` };
  }
  if (params.mode !== 'exact' && params.mode !== 'atMost') {
    return { ok: false, reason: `unknown mode: ${params.mode}` };
  }
  if (params.variant !== 'A' && params.variant !== 'B') {
    return { ok: false, reason: `unknown variant: ${params.variant}` };
  }
  if (params.variant === 'B') {
    if (params.d === undefined || !Number.isInteger(params.d) || params.d <= 0) {
      return { ok: false, reason: 'Variant B requires a positive integer d' };
    }
    // Spec: d = ⌈log₂(B+1)⌉ (Potential Extensions §binary decomposition).
    // Enforce exactly — accepting d > ⌈log₂(B+1)⌉ would silently admit
    // padded bit-decompositions with proof-size attack surface for no
    // cryptographic gain.
    const expectedD = Math.ceil(Math.log2(params.budget + 1));
    if (params.d !== expectedD) {
      return {
        ok: false,
        reason: `Variant B d (${params.d}) must equal ⌈log₂(B+1)⌉ = ${expectedD}`,
      };
    }
  }
  if (inputs.electionId.length !== 32) {
    return { ok: false, reason: `electionId must be 32 bytes (got ${inputs.electionId.length})` };
  }
  if (inputs.pseudonym.length !== 32) {
    return { ok: false, reason: `pseudonym must be 32 bytes (got ${inputs.pseudonym.length})` };
  }
  if (mpk.isIdentity()) {
    return { ok: false, reason: 'mpk is the identity — rejected (would collapse ciphertext privacy)' };
  }
  const expectedCts =
    params.variant === 'A'
      ? params.numCandidates
      : params.numCandidates * (params.d ?? 0);
  if (inputs.ciphertexts.length !== expectedCts) {
    return {
      ok: false,
      reason: `ciphertexts.length (${inputs.ciphertexts.length}) != expected (${expectedCts})`,
    };
  }

  // Track every G1/G2 point we allocate so they are freed in the finally block
  // regardless of which path (ok or early-return) this function takes.
  // Callers own mpk — we do NOT free it here.
  const ownedG1: G1Point[] = [];
  const ownedG2: G2Point[] = [];

  function trackG1(p: G1Point): G1Point { ownedG1.push(p); return p; }
  function trackG2(p: G2Point): G2Point { ownedG2.push(p); return p; }
  function freeOwned(): void {
    for (const p of ownedG1) p.destroyWasm();
    for (const p of ownedG2) p.destroyWasm();
    ownedG1.length = 0;
    ownedG2.length = 0;
  }

  try {
    // Decode vk (subgroup-checked in G1Point.fromBytes).
    let vk: G1Point;
    try {
      vk = trackG1(G1Point.fromBytes(inputs.vk));
    } catch (e) {
      return { ok: false, reason: `vk decode: ${(e as Error).message}` };
    }
    if (vk.isIdentity()) {
      return { ok: false, reason: 'vk is the identity — rejected (sk=0 breaks signature soundness)' };
    }

    // Decode every (C1, C2). Each G2Point.fromBytes runs a subgroup check.
    const cts: Ciphertext[] = new Array(inputs.ciphertexts.length);
    for (let i = 0; i < inputs.ciphertexts.length; i++) {
      const [c1Bytes, c2Bytes] = inputs.ciphertexts[i]!;
      try {
        cts[i] = {
          c1: trackG2(G2Point.fromBytes(c1Bytes)),
          c2: trackG2(G2Point.fromBytes(c2Bytes)),
        };
      } catch (e) {
        return { ok: false, reason: `ciphertext[${i}] decode: ${(e as Error).message}` };
      }
    }

    // WR-Server attestation (caller-supplied).
    if (
      !verifyWRAttestation(
        inputs.electionId,
        inputs.pseudonym,
        inputs.vk,
        inputs.wrAttestation,
      )
    ) {
      return { ok: false, reason: 'wrAttestation verification failed' };
    }

    // Decode zkProof.
    let bvp: BallotValidityProof;
    try {
      bvp = decodeBallotValidityProof(inputs.zkProof, {
        variant: params.variant,
        numCandidates: params.numCandidates,
        budget: params.budget,
        d: params.d,
      });
    } catch (e) {
      return { ok: false, reason: `zkProof decode: ${(e as Error).message}` };
    }
    // Track all G2 commitment points decoded from the proof (a1, a2 per branch).
    for (const orProof of bvp.rangeOrBit) {
      for (const br of orProof.branches) {
        trackG2(br.a1);
        trackG2(br.a2);
      }
    }
    if (bvp.budget.mode === 'atMost') {
      for (const br of bvp.budget.proof.branches) {
        trackG2(br.a1);
        trackG2(br.a2);
      }
    }

    if (bvp.budget.mode !== params.mode) {
      return {
        ok: false,
        reason: `budget mode on wire (${bvp.budget.mode}) differs from params (${params.mode})`,
      };
    }

    // Build the shared transcript and run every proof against it.
    const t = seedBallotTranscript(inputs.electionId, mpk, vk, cts, params);

    let ctSum: Ciphertext;
    if (params.variant === 'A') {
      // ℓ range proofs over {0, …, B}, one per candidate.
      if (bvp.rangeOrBit.length !== params.numCandidates) {
        return {
          ok: false,
          reason: `rangeOrBit.length (${bvp.rangeOrBit.length}) != numCandidates (${params.numCandidates})`,
        };
      }
      const candidates = rangeCandidates(params.budget);
      for (let j = 0; j < params.numCandidates; j++) {
        t.append('ballot:range', u16BE(j));
        const stmt: ORStatement = { ct: cts[j]!, mpk, candidates };
        if (!verifyOR(stmt, bvp.rangeOrBit[j]!, t)) {
          return { ok: false, reason: `range proof ${j} failed` };
        }
      }
      if (cts.length === 1) {
        ctSum = cts[0]!;
      } else {
        ctSum = sumCts(cts);
        // sumCts returns a fresh allocation — track it so it gets freed.
        trackG2(ctSum.c1);
        trackG2(ctSum.c2);
      }
    } else {
      // Variant B: ℓ·d bit proofs over {0,1}. Caller reconstructs
      //   ĉ_j = Σ_k 2^k · c_{j,k}  (Munich §6.2.2)
      // and the budget proof runs on ĉ = Σ_j ĉ_j.
      const d = params.d!;
      const totalBits = params.numCandidates * d;
      if (bvp.rangeOrBit.length !== totalBits) {
        return {
          ok: false,
          reason: `rangeOrBit.length (${bvp.rangeOrBit.length}) != numCandidates·d (${totalBits})`,
        };
      }
      const bitCandidates: readonly bigint[] = [0n, 1n];
      for (let jk = 0; jk < totalBits; jk++) {
        t.append('ballot:bit', u16BE(jk));
        const stmt: ORStatement = { ct: cts[jk]!, mpk, candidates: bitCandidates };
        if (!verifyOR(stmt, bvp.rangeOrBit[jk]!, t)) {
          return { ok: false, reason: `bit proof ${jk} failed` };
        }
      }
      // Reconstruct each ĉ_j, then ĉ = Σ_j ĉ_j.
      const cHats: Ciphertext[] = new Array(params.numCandidates);
      for (let j = 0; j < params.numCandidates; j++) {
        let acc: Ciphertext | null = null;
        for (let k = 0; k < d; k++) {
          const weighted = scalarMulCt(1n << BigInt(k), cts[j * d + k]!);
          trackG2(weighted.c1);
          trackG2(weighted.c2);
          if (acc === null) {
            acc = weighted;
          } else {
            const next = addCt(acc, weighted);
            trackG2(next.c1);
            trackG2(next.c2);
            acc = next;
          }
        }
        cHats[j] = acc!;
      }
      if (cHats.length === 1) {
        ctSum = cHats[0]!;
      } else {
        ctSum = sumCts(cHats);
        trackG2(ctSum.c1);
        trackG2(ctSum.c2);
      }
    }

    t.append('ballot:budget', new Uint8Array([0]));
    if (
      !verifyBudget(
        { ctSum, mpk, budget: BigInt(params.budget) },
        bvp.budget,
        t,
      )
    ) {
      return { ok: false, reason: 'budget proof failed' };
    }

    // Schnorr — canonical preimage → keccak256 → verify.
    let sig;
    try {
      sig = decodeSchnorr(inputs.voterSignature);
    } catch (e) {
      return { ok: false, reason: `signature decode: ${(e as Error).message}` };
    }
    trackG1(sig.R); // R is a G1Point allocated by decodeSchnorr

    const preimage = canonicalBallotMessage({
      electionId: inputs.electionId,
      pseudonym: inputs.pseudonym,
      ciphertexts: inputs.ciphertexts,
      zkProof: inputs.zkProof,
    });
    const msg = keccak256(preimage, 'bytes');
    if (!schnorrVerify(vk, msg, sig)) {
      return { ok: false, reason: 'signature invalid' };
    }

    return { ok: true };
  } finally {
    freeOwned();
  }
}

function u16BE(n: number): Uint8Array {
  if (n < 0 || n > 0xffff) throw new Error(`u16 out of range: ${n}`);
  const out = new Uint8Array(2);
  out[0] = (n >>> 8) & 0xff;
  out[1] = n & 0xff;
  return out;
}
