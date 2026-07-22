/**
 * BLS12-381 scalar-field helpers.
 *
 * Q is the prime order of the G1/G2 subgroups. Scalars are plain `bigint`s
 * reduced into [0, Q); we do not wrap them in a class (see plan §4.1 deviation
 * note — option C). The helpers here are the only place we convert between
 * the bigint view and the wire / BLST byte view.
 */

export const Q: bigint =
  0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n;

export const SCALAR_BYTES = 32;

export function bytesToBigIntBE(b: Uint8Array): bigint {
  let x = 0n;
  for (const byte of b) x = (x << 8n) | BigInt(byte);
  return x;
}

export function bigIntToBytesBE(n: bigint, length: number): Uint8Array {
  if (n < 0n) throw new Error('bigIntToBytesBE: negative input');
  const out = new Uint8Array(length);
  let x = n;
  for (let i = length - 1; i >= 0; i--) {
    out[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  if (x !== 0n) throw new Error('bigIntToBytesBE: overflow');
  return out;
}

/**
 * Reduce arbitrary-length big-endian bytes modulo Q. Feed at least 512 bits
 * of entropy (typically 64 bytes from two hash rounds) to keep the bias to
 * the subgroup order negligible (~2^-257 for 64-byte input).
 */
export function wideReduce(bytes: Uint8Array): bigint {
  return bytesToBigIntBE(bytes) % Q;
}

export function modQ(n: bigint): bigint {
  const r = n % Q;
  return r < 0n ? r + Q : r;
}

// ---------- Scalar helpers (bigint-valued) ----------

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  const g = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (g && typeof g.getRandomValues === 'function') {
    g.getRandomValues(out);
    return out;
  }
  throw new Error(
    'No CSPRNG available: expected globalThis.crypto.getRandomValues',
  );
}

/**
 * Sample a uniformly random scalar in [0, Q) using the platform CSPRNG.
 * Draws 64 bytes and wide-reduces; residual bias is ~2^-257.
 */
export function randomScalar(): bigint {
  return wideReduce(randomBytes(64));
}

/** Canonical 32-BE encoding of a scalar. Rejects values ≥ Q. */
export function scalarToBytes(s: bigint): Uint8Array {
  if (s < 0n || s >= Q) {
    throw new Error('scalarToBytes: value out of range [0, Q)');
  }
  return bigIntToBytesBE(s, SCALAR_BYTES);
}

/** Parse a canonical 32-BE scalar encoding. Rejects wrong length or ≥ Q. */
export function scalarFromBytes(b: Uint8Array): bigint {
  if (b.length !== SCALAR_BYTES) {
    throw new Error(`scalarFromBytes: expected 32 bytes, got ${b.length}`);
  }
  const n = bytesToBigIntBE(b);
  if (n >= Q) {
    throw new Error('scalarFromBytes: value out of range (≥ Q)');
  }
  return n;
}

/** Fermat inverse a^{Q-2} mod Q. Throws on zero. */
export function scalarInv(a: bigint): bigint {
  const x = modQ(a);
  if (x === 0n) throw new Error('scalarInv: zero is not invertible');
  // Square-and-multiply; Q is fixed so the timing depends only on public Q,
  // not the secret input. That's sufficient for the values this SDK inverts
  // (public challenges, never secret randomness).
  let result = 1n;
  let base = x;
  let exp = Q - 2n;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % Q;
    base = (base * base) % Q;
    exp >>= 1n;
  }
  return result;
}
