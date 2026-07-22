/**
 * Fiat–Shamir transcript used by every non-interactive proof in the SDK.
 *
 * A `Transcript` is an append-only byte log that the prover and verifier each
 * build up identically. When `challenge(tag)` is called, the log (plus the
 * per-challenge tag) is hashed to scalar via `hashToScalar`. The drawn
 * challenge is folded back into the log so that any later appends and any
 * later challenges are bound to it — this is the Merlin-style composition
 * that keeps multi-challenge proofs safely separated.
 *
 * Per Munich spec §6.1–§6.3, every challenge must bind:
 *   1. public generators / group-independent constants (P2, mpk),
 *   2. the statement being proved (ciphertexts, points),
 *   3. the prover's commitments,
 *   4. the voter's verification key vk — this is what makes the proof
 *      non-transferable and blocks ballot copying (Theorem 7.1's privacy
 *      argument relies on this binding).
 *
 * The caller is responsible for all four; this class is agnostic about what
 * gets appended. The tags are free-form strings used purely for domain
 * separation — they never need to stay stable across protocol versions, but
 * prover and verifier must use identical ones.
 */

import { G1Point, G2Point } from '../crypto/curve';
import { DST_FIAT_SHAMIR, hashToScalar } from '../crypto/hash';
import { scalarToBytes } from '../crypto/field';

const encoder = new TextEncoder();

/** Big-endian uint32 length prefix, for unambiguous concatenation. */
function u32BE(n: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = (n >>> 24) & 0xff;
  out[1] = (n >>> 16) & 0xff;
  out[2] = (n >>> 8) & 0xff;
  out[3] = n & 0xff;
  return out;
}

export class Transcript {
  private readonly parts: Uint8Array[] = [];

  /**
   * `label` identifies the proof system (e.g. "SHUTTER-VOTE-OR-A-v1").
   * Different labels keep challenges drawn in different protocols separate
   * even if the subsequent appends happen to collide.
   */
  constructor(label: string) {
    this.appendRaw(encoder.encode(label));
  }

  /** Append a tagged byte string. Length-prefixed so concatenation is injective. */
  append(tag: string, value: Uint8Array): void {
    const tagBytes = encoder.encode(tag);
    this.appendRaw(u32BE(tagBytes.length));
    this.appendRaw(tagBytes);
    this.appendRaw(u32BE(value.length));
    this.appendRaw(value);
  }

  appendPoint(tag: string, p: G1Point | G2Point): void {
    this.append(tag, p.toBytes());
  }

  appendScalar(tag: string, s: bigint): void {
    this.append(tag, scalarToBytes(s));
  }

  /**
   * Draw a challenge bound to everything appended so far, plus the tag. The
   * drawn scalar is also folded back into the transcript, so a subsequent
   * `challenge(…)` call produces a different, dependent scalar — each
   * challenge in a multi-round proof is therefore uniquely determined.
   */
  challenge(tag: string): bigint {
    const tagBytes = encoder.encode(tag);
    const e = hashToScalar(
      DST_FIAT_SHAMIR,
      u32BE(tagBytes.length),
      tagBytes,
      ...this.parts,
    );
    this.appendScalar(tag + ':chal', e);
    return e;
  }

  private appendRaw(b: Uint8Array): void {
    this.parts.push(b);
  }
}
