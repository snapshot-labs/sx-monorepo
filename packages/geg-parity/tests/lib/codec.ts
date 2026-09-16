/**
 * Vector-file decoding helpers.
 *
 * Deliberately small: everything here is parsing, never verification. The point
 * of this package is that the *shipped* crypto — the published
 * `@shutter-network/urban-verified-crypto` build — is what checks each vector,
 * so any verifier reimplemented here would be marking its own homework.
 */

import {
  G1Point,
  G2Point,
  type SchnorrSig
} from '@shutter-network/urban-verified-crypto';

/**
 * Strict hex decode. The protocol emits bare hex in the primitive vectors and
 * `0x`-prefixed hex in the flow envelopes, so both are accepted — anything else
 * throws rather than silently decoding to a short buffer, which is what
 * `Buffer.from(s, 'hex')` does on its own and how a parity test quietly turns
 * into a no-op.
 */
export function hexToBytes(value: unknown, label = 'value'): Uint8Array {
  if (typeof value !== 'string') throw new Error(`${label}: not a string`);
  const body =
    value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value;
  if (body.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(body)) {
    throw new Error(`${label}: not hex (${value.slice(0, 24)}…)`);
  }
  return new Uint8Array(Buffer.from(body, 'hex'));
}

export function bytesToHex(b: Uint8Array): string {
  return Buffer.from(b).toString('hex');
}

export function decToScalar(s: string): bigint {
  return BigInt(s);
}

export function g1FromHex(h: string): G1Point {
  return G1Point.fromBytes(hexToBytes(h, 'g1'));
}

export function g2FromHex(h: string): G2Point {
  return G2Point.fromBytes(hexToBytes(h, 'g2'));
}

const G1_BYTES = 48;

/**
 * A Schnorr signature on the wire is `R ‖ s`: a compressed G1 point followed by
 * a 32-byte big-endian scalar. The package exports the encoder but not the
 * decoder, and splitting a fixed-width buffer is not cryptography.
 */
export function decodeSchnorrSig(bytes: Uint8Array): SchnorrSig {
  if (bytes.length !== G1_BYTES + 32) {
    throw new Error(`schnorr: expected 80 bytes, got ${bytes.length}`);
  }
  let s = 0n;
  for (const byte of bytes.subarray(G1_BYTES)) s = (s << 8n) | BigInt(byte);
  return { R: G1Point.fromBytes(bytes.subarray(0, G1_BYTES)), s };
}
