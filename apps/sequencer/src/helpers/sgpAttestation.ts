/**
 * The eligibility issuer: signs the credential that binds a ballot key to a
 * voting weight, which every keyper checks before counting the ballot.
 *
 * The credential's byte format and signature come from the SDK, so they match
 * what the keypers verify. This module only owns the issuer key.
 */

import {
  G1Point,
  schnorrKeygen,
  signAttestation
} from '@shutter-network/urban-verified-crypto';
import { ensureCurvesInit } from './te';

export class SgpAttestationError extends Error {}

const SK_RE = /^(0x)?[0-9a-fA-F]{64}$/;

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
    throw new SgpAttestationError(
      'TE_ELIGIBILITY_PRIVATE_KEY is not configured'
    );
  }
  if (!SK_RE.test(raw.trim())) {
    throw new SgpAttestationError(
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
    throw new SgpAttestationError(
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
  /** Re-vote counter, at least 1; the committee counts the highest. */
  nonce: bigint;
}

function bytes(hex: string, label: string, size: number): Uint8Array {
  const body = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (body.length !== size * 2 || !/^[0-9a-fA-F]*$/.test(body)) {
    throw new SgpAttestationError(`${label}: expected ${size} bytes of hex`);
  }
  return new Uint8Array(Buffer.from(body, 'hex'));
}

/** Issue one credential. Returns the 80-byte signature as `0x` hex. */
export async function mintAttestation(args: MintArgs): Promise<string> {
  if (args.weight < 1n) {
    throw new SgpAttestationError(`weight must be >= 1 (got ${args.weight})`);
  }
  if (args.nonce < 1n) {
    throw new SgpAttestationError(`nonce must be >= 1 (got ${args.nonce})`);
  }
  const { sk, vk } = await getIssuer();
  const signature = signAttestation(sk, vk, {
    electionId: bytes(args.electionId, 'electionId', 32),
    pseudonym: bytes(args.pseudonym, 'pseudonym', 32),
    vk: bytes(args.vk, 'vk', 48),
    weight: args.weight,
    nonce: args.nonce
  });
  return `0x${Buffer.from(signature).toString('hex')}`;
}
