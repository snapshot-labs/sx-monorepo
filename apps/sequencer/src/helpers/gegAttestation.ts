/**
 * The eligibility issuer: turns a stored vote's voting power into a signed
 * credential the keypers can verify.
 *
 * A weighted tally is only re-derivable from public data if the weight each
 * ballot was counted with is itself a public, verifiable artifact. Snapshot
 * records voting power in `votes.vp`, which is just a number in a database — an
 * auditor has no way to check that the weight used in the aggregate is the weight
 * that was recorded. Signing it fixes that: the credential binds
 * `(electionId, pseudonym, vk, weight, nonce)`, so anyone can confirm the tally
 * used the attested weight for the attested ballot.
 *
 * This adds **no new trust**. The sequencer is already authoritative for voting
 * power; what changes is that its claim becomes checkable. An auditor can verify
 * the binding, not the correctness of the voting power itself — that remains a
 * question about strategies and the score API, exactly as it is today.
 *
 * `nonce` is the vote's own timestamp. That is not a convenience: the protocol
 * ranks duplicate ballots by `(nonce, sequenceNumber)` and keeps the highest
 * under a last-wins policy, which is precisely Snapshot's "newer vote wins" rule.
 * A replayed older ballot loses on nonce.
 */

import { keccak256 } from '@ethersproject/keccak256';
import {
  encodeSchnorr,
  G1Point,
  initCurves,
  schnorrKeygen,
  schnorrSign,
  schnorrVerify
} from '@shutter-network/urban-verified-crypto';

export class GegAttestationError extends Error {}

/**
 * The signed message, built here rather than taken from the crypto package.
 *
 * **Temporary — delete this and import from the SDK once it is published.**
 * `signAttestation`, `attestationMessage` and `verifyAttestation` have been
 * implemented upstream in `@shutter-network/urban-verified-crypto`, but are not
 * in a released version yet. When they are: bump the pin, drop everything down
 * to `mintAttestation`, and import `signAttestation` instead. The tests in
 * `test/unit/geg-attestation.test.ts` stay — they verify the credential, not the
 * code path that produced it, so they are exactly what should prove the swap was
 * inert.
 *
 * Until then, the construction lives here. The credential is signed over
 * `keccak256` of a transcript byte-log: the label, then each field as
 * `u32BE(len(tag)) ‖ tag ‖ u32BE(len(value)) ‖ value`, with the two integers as
 * 32-byte big-endian scalars. The released package builds that same log
 * internally for its proof transcripts but does not expose the raw bytes, and
 * this is the one place that needs them — a signature over a whole transcript,
 * rather than a Fiat–Shamir challenge drawn from one.
 *
 * Reproducing the framing here is what lets the crypto stay an unmodified
 * published dependency rather than a fork carrying one extra method. It is pure
 * byte concatenation, no curve arithmetic, and `test/unit/geg-attestation.test.ts`
 * pins it against the protocol's own reference vectors — so a drift on either
 * side fails the build rather than quietly minting credentials the keypers
 * reject.
 */
const ATTESTATION_LABEL = 'SHUTTER-VOTE-ATTEST-v1';

const textEncoder = new TextEncoder();

function u32BE(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n);
  return b;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** One length-prefixed transcript entry. */
function field(tag: string, value: Uint8Array): Uint8Array {
  const t = textEncoder.encode(tag);
  return concatBytes([u32BE(t.length), t, u32BE(value.length), value]);
}

/** A scalar as the transcript encodes it: 32 bytes, big-endian. */
function scalar32BE(value: bigint): Uint8Array {
  const b = new Uint8Array(32);
  let v = value;
  for (let i = 31; i >= 0; i--) {
    b[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return b;
}

export function attestationMessage(
  electionId: Uint8Array,
  pseudonym: Uint8Array,
  vk: Uint8Array,
  weight: bigint,
  nonce: bigint
): Uint8Array {
  const preimage = concatBytes([
    textEncoder.encode(ATTESTATION_LABEL), // the label seeds the log unprefixed
    field('attest:electionId', electionId),
    field('attest:pseudonym', pseudonym),
    field('attest:vk', vk),
    field('attest:weight', scalar32BE(weight)),
    field('attest:nonce', scalar32BE(nonce))
  ]);
  return new Uint8Array(Buffer.from(keccak256(preimage).slice(2), 'hex'));
}

const SK_RE = /^(0x)?[0-9a-fA-F]{64}$/;

let curvesReady: Promise<void> | null = null;
function ensureCurvesInit(): Promise<void> {
  if (!curvesReady) curvesReady = initCurves();
  return curvesReady;
}

interface Issuer {
  sk: bigint;
  vk: G1Point;
  /** Compressed 48-byte G1 public key, `0x`-prefixed lowercase hex. */
  publicKey: string;
}

let issuer: Issuer | null = null;

/** Test seam: drop the memoised issuer so a test can vary the configured key. */
export function resetIssuer(): void {
  issuer?.vk.destroyWasm();
  issuer = null;
}

/**
 * The configured issuer, memoised. The key point is held for the process
 * lifetime rather than rebuilt per request — it is a single WASM allocation and
 * every ballot read needs it.
 */
async function getIssuer(): Promise<Issuer> {
  if (issuer) return issuer;

  const raw = process.env.TE_ELIGIBILITY_PRIVATE_KEY;
  if (!raw?.trim()) {
    throw new GegAttestationError(
      'TE_ELIGIBILITY_PRIVATE_KEY is not configured'
    );
  }
  if (!SK_RE.test(raw.trim())) {
    throw new GegAttestationError(
      'TE_ELIGIBILITY_PRIVATE_KEY must be 32 bytes of hex'
    );
  }

  await ensureCurvesInit();
  const sk = BigInt(
    raw.trim().startsWith('0x') ? raw.trim() : `0x${raw.trim()}`
  );
  let keys;
  try {
    keys = schnorrKeygen(sk);
  } catch (err: any) {
    // schnorrKeygen rejects sk ≡ 0 mod Q, which would make every signature
    // trivially verifiable under the identity key.
    throw new GegAttestationError(
      `TE_ELIGIBILITY_PRIVATE_KEY is not a valid scalar: ${err?.message || err}`
    );
  }
  issuer = {
    sk: keys.sk,
    vk: keys.vk,
    publicKey: `0x${Buffer.from(keys.vk.toBytes()).toString('hex')}`
  };
  return issuer;
}

/** The public key to publish and to freeze into a proposal's config. */
export async function eligibilityPublicKey(): Promise<string> {
  return (await getIssuer()).publicKey;
}

export interface MintArgs {
  /** 32-byte election id, `0x`-prefixed. */
  electionId: string;
  /** 32-byte pseudonym from the ballot envelope, `0x`-prefixed. */
  pseudonym: string;
  /** 48-byte compressed G1 voter key from the ballot envelope, `0x`-prefixed. */
  vk: string;
  /** Integer weight, at least 1. */
  weight: bigint;
  /** Monotonic re-vote counter; the vote's timestamp. */
  nonce: bigint;
}

function bytes(hex: string, label: string, size: number): Uint8Array {
  const body = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (body.length !== size * 2 || !/^[0-9a-fA-F]*$/.test(body)) {
    throw new GegAttestationError(`${label}: expected ${size} bytes of hex`);
  }
  return new Uint8Array(Buffer.from(body, 'hex'));
}

/** Issue one credential. Returns the 80-byte signature as `0x` hex. */
export async function mintAttestation(args: MintArgs): Promise<string> {
  if (args.weight < 1n) {
    throw new GegAttestationError(`weight must be >= 1 (got ${args.weight})`);
  }
  if (args.nonce < 1n) {
    throw new GegAttestationError(`nonce must be >= 1 (got ${args.nonce})`);
  }
  const { sk, vk } = await getIssuer();
  const message = attestationMessage(
    bytes(args.electionId, 'electionId', 32),
    bytes(args.pseudonym, 'pseudonym', 32),
    bytes(args.vk, 'vk', 48),
    args.weight,
    args.nonce
  );
  const signature = encodeSchnorr(schnorrSign(sk, vk, message));
  return `0x${Buffer.from(signature).toString('hex')}`;
}

/**
 * Verify a credential this process just minted, before the vote is stored.
 *
 * Not paranoia about our own signature — the same rule as the dust floor and the
 * voting-window boundary: **do not accept what the committee will drop.** If
 * minting is wrong (bad framing, wrong key, an encoding slip) the ballot is
 * otherwise valid, so it would be accepted, stored, and shown to the voter as
 * cast, then excluded at tally as `INVALID_ATTESTATION`. Accepted at one end and
 * discarded at the other, with the voter believing they voted. Checking here
 * turns that into an immediate rejection.
 *
 * Both halves are checked because both are what `verify_attestation` checks on
 * the committee side: the signature, and `weight >= 1`. A signature
 * that verifies at an out-of-range weight is still an `INVALID_ATTESTATION`
 * exclusion.
 *
 * This exists here rather than coming from the SDK because the SDK's released
 * surface has no attestation verifier — see the note on `attestationMessage`.
 * It shares that function's framing, so the reference vectors that pin the
 * framing pin this too.
 */
export async function verifyAttestation(
  args: MintArgs & { signature: string }
): Promise<boolean> {
  // No upper bound: the protocol's per-election `maxWeight` is gone. It only
  // constrained anything while voting power was clamped — once it is not, the bound
  // must sit at or above the largest legitimate holder, which bounds nothing useful.
  if (args.weight < 1n) return false;
  if (args.nonce < 1n) return false;

  const { vk: issuerVk } = await getIssuer();
  let message: Uint8Array;
  let sig: Uint8Array;
  try {
    message = attestationMessage(
      bytes(args.electionId, 'electionId', 32),
      bytes(args.pseudonym, 'pseudonym', 32),
      bytes(args.vk, 'vk', 48),
      args.weight,
      args.nonce
    );
    sig = bytes(args.signature, 'signature', 80);
  } catch {
    return false;
  }

  // `decodeSchnorr` is the inverse of the SDK's `encodeSchnorr`, but the released
  // package exports only the forward direction, so the 80-byte wire form is
  // unpacked here: `R (48, compressed G1) ‖ s (32, big-endian)`. Same layout as
  // the protocol's `schnorr.encode`/`decode`, and the reference vectors cover a
  // round trip through it.
  let R: G1Point;
  let sScalar: bigint;
  try {
    R = G1Point.fromBytes(sig.subarray(0, 48));
    sScalar = BigInt(`0x${Buffer.from(sig.subarray(48)).toString('hex')}`);
  } catch {
    return false;
  }
  try {
    return schnorrVerify(issuerVk, message, { R, s: sScalar });
  } catch {
    return false;
  } finally {
    R.destroyWasm();
  }
}
