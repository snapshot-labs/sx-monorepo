/**
 * Hash-to-scalar used for Fiat–Shamir challenges across all proof systems
 * in this SDK. The construction is two keccak256 invocations with distinct
 * 1-byte prefixes concatenated into 64 bytes of pseudorandomness, reduced
 * modulo Q. Using keccak256 (already a dependency via viem) keeps the
 * construction reproducible by any Solidity- or EVM-adjacent verifier.
 *
 * See Munich spec §6.1–§6.3 — the hash inputs (domain separator + public
 * transcript values) are the responsibility of the caller / the Transcript
 * class; `hashToScalar` just binds them into a uniform scalar (bigint in
 * [0, Q)).
 */

import { keccak256 } from 'viem';
import { wideReduce } from './field';

const encoder = new TextEncoder();

export const DST_FIAT_SHAMIR = encoder.encode('SHUTTER-VOTE-FS-v1');
/** @public */
export const DST_HASH_TO_CURVE_G1 = encoder.encode(
  'SHUTTER-VOTE-HASH-TO-G1-v1'
);
/** @public */
export const DST_HASH_TO_CURVE_G2 = encoder.encode(
  'SHUTTER-VOTE-HASH-TO-G2-v1'
);

function concatBytes(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

export function hashToScalar(
  domainSep: Uint8Array,
  ...parts: Uint8Array[]
): bigint {
  const preimage = concatBytes([domainSep, ...parts]);
  const h1 = keccak256(
    concatBytes([new Uint8Array([0x00]), preimage]),
    'bytes'
  );
  const h2 = keccak256(
    concatBytes([new Uint8Array([0x01]), preimage]),
    'bytes'
  );
  const wide = new Uint8Array(64);
  wide.set(h1, 0);
  wide.set(h2, 32);
  return wideReduce(wide);
}
