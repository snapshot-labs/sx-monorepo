import {
  G1Point,
  G2Point,
  G1_BYTES,
  G2_BYTES,
  initCurves,
} from '../src';
import {
  Q,
  SCALAR_BYTES,
  bytesToBigIntBE,
  bigIntToBytesBE,
  modQ,
  wideReduce,
  randomScalar,
  scalarToBytes,
  scalarFromBytes,
  scalarInv,
} from '../src/crypto/field';
import { hashToScalar, DST_FIAT_SHAMIR } from '../src/crypto/hash';

beforeAll(async () => {
  await initCurves();
});

describe('field helpers', () => {
  it('Q is 255 bits and matches the BLS12-381 subgroup order', () => {
    expect(Q).toBe(
      0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n,
    );
    expect(Q.toString(2).length).toBe(255);
  });

  it('bigIntToBytesBE ↔ bytesToBigIntBE round-trip', () => {
    for (const n of [0n, 1n, 0xdeadbeefn, Q - 1n]) {
      const b = bigIntToBytesBE(n, SCALAR_BYTES);
      expect(b.length).toBe(SCALAR_BYTES);
      expect(bytesToBigIntBE(b)).toBe(n);
    }
  });

  it('bigIntToBytesBE rejects values that do not fit', () => {
    expect(() => bigIntToBytesBE(Q, SCALAR_BYTES)).not.toThrow(); // Q itself fits in 32 bytes
    expect(() => bigIntToBytesBE(1n << 256n, SCALAR_BYTES)).toThrow(/overflow/);
    expect(() => bigIntToBytesBE(-1n, SCALAR_BYTES)).toThrow(/negative/);
  });

  it('modQ normalises negatives', () => {
    expect(modQ(-1n)).toBe(Q - 1n);
    expect(modQ(Q)).toBe(0n);
    expect(modQ(Q + 5n)).toBe(5n);
  });

  it('wideReduce handles arbitrary-length input', () => {
    const wide = new Uint8Array(64);
    wide.fill(0xff);
    const reduced = wideReduce(wide);
    expect(reduced).toBeLessThan(Q);
    expect(reduced).toBe(((1n << 512n) - 1n) % Q);
  });
});

describe('scalar helpers', () => {
  it('scalarToBytes ↔ scalarFromBytes round-trip', () => {
    for (const n of [0n, 1n, 2n, 0xdeadbeefcafebaben, Q - 1n, Q / 2n]) {
      const bytes = scalarToBytes(n);
      expect(bytes.length).toBe(SCALAR_BYTES);
      expect(scalarFromBytes(bytes)).toBe(n);
    }
  });

  it('scalarFromBytes rejects non-canonical (≥ Q) encodings', () => {
    const b = bigIntToBytesBE(Q, SCALAR_BYTES);
    expect(() => scalarFromBytes(b)).toThrow(/out of range/);
    expect(() => scalarFromBytes(new Uint8Array(31))).toThrow(/32 bytes/);
  });

  it('scalarToBytes rejects out-of-range inputs', () => {
    expect(() => scalarToBytes(-1n)).toThrow(/out of range/);
    expect(() => scalarToBytes(Q)).toThrow(/out of range/);
  });

  it('scalarInv returns the multiplicative inverse and rejects zero', () => {
    const a = 0x1234n;
    const ai = scalarInv(a);
    expect((a * ai) % Q).toBe(1n);
    expect(() => scalarInv(0n)).toThrow(/not invertible/);
    // Normalises negative input
    const b = -5n;
    const bi = scalarInv(b);
    expect((modQ(b) * bi) % Q).toBe(1n);
  });

  it('randomScalar produces in-range values that differ across calls', () => {
    const r1 = randomScalar();
    const r2 = randomScalar();
    expect(r1).toBeGreaterThanOrEqual(0n);
    expect(r1).toBeLessThan(Q);
    expect(r2).toBeLessThan(Q);
    expect(r1).not.toBe(r2);
  });
});

describe('G1Point', () => {
  it('generator is in subgroup and has 48-byte compressed form', () => {
    const g = G1Point.generator();
    expect(g.isIdentity()).toBe(false);
    expect(g.toBytes().length).toBe(G1_BYTES);
  });

  it('identity round-trips and behaves as additive zero', () => {
    const id = G1Point.identity();
    expect(id.isIdentity()).toBe(true);
    const g = G1Point.generator();
    expect(g.add(id).equals(g)).toBe(true);
  });

  it('2·G == G + G (scalar-mul / point-add consistency)', () => {
    const g = G1Point.generator();
    expect(g.mul(2n).equals(g.add(g))).toBe(true);
  });

  it('(a+b)·G == a·G + b·G', () => {
    const a = 0x11n;
    const b = 0x22n;
    const g = G1Point.generator();
    expect(g.mul(modQ(a + b)).equals(g.mul(a).add(g.mul(b)))).toBe(true);
  });

  it('compressed round-trip preserves the point', () => {
    const p = G1Point.generator().mul(0xdeadn);
    const bytes = p.toBytes();
    expect(G1Point.fromBytes(bytes).equals(p)).toBe(true);
  });

  it('fromBytes rejects malformed / off-curve encodings', () => {
    const zero = new Uint8Array(G1_BYTES);
    // The all-zero 48-byte compressed encoding is invalid for BLS12-381.
    expect(() => G1Point.fromBytes(zero)).toThrow();
    expect(() => G1Point.fromBytes(new Uint8Array(47))).toThrow(/48 bytes/);
  });

  it('neg is the additive inverse', () => {
    const g = G1Point.generator();
    expect(g.add(g.neg()).isIdentity()).toBe(true);
  });

  it('sub matches add(neg)', () => {
    const g = G1Point.generator();
    const h = g.mul(7n);
    expect(g.sub(h).equals(g.add(h.neg()))).toBe(true);
  });

  it('mul normalises negative / out-of-range scalars via modQ', () => {
    const g = G1Point.generator();
    expect(g.mul(-1n).equals(g.mul(Q - 1n))).toBe(true);
    expect(g.mul(Q + 5n).equals(g.mul(5n))).toBe(true);
  });
});

describe('G2Point', () => {
  it('generator is in subgroup and has 96-byte compressed form', () => {
    const g = G2Point.generator();
    expect(g.isIdentity()).toBe(false);
    expect(g.toBytes().length).toBe(G2_BYTES);
  });

  it('scalar-mul / point-add consistency', () => {
    const g = G2Point.generator();
    const a = 17n;
    const b = 23n;
    expect(g.mul(a + b).equals(g.mul(a).add(g.mul(b)))).toBe(true);
  });

  it('compressed round-trip preserves the point', () => {
    const p = G2Point.generator().mul(0xbeefn);
    expect(G2Point.fromBytes(p.toBytes()).equals(p)).toBe(true);
  });

  it('fromBytes rejects wrong-length and malformed encodings', () => {
    expect(() => G2Point.fromBytes(new Uint8Array(95))).toThrow(/96 bytes/);
    expect(() => G2Point.fromBytes(new Uint8Array(G2_BYTES))).toThrow();
  });

  it('(a·b)·G == a·(b·G) (scalar associativity over G2)', () => {
    const g = G2Point.generator();
    const a = 0xabcn;
    const b = 0xdefn;
    expect(g.mul(modQ(a * b)).equals(g.mul(a).mul(b))).toBe(true);
  });

  it('Q·G = identity (subgroup order annihilates generator)', () => {
    const g = G2Point.generator();
    // Q is outside the canonical [0, Q) range; multiply by (Q-1) then add G.
    expect(g.mul(Q - 1n).add(g).isIdentity()).toBe(true);
  });
});

describe('hashToScalar', () => {
  it('is deterministic and produces in-range scalars', () => {
    const msg = new TextEncoder().encode('hello');
    const s1 = hashToScalar(DST_FIAT_SHAMIR, msg);
    const s2 = hashToScalar(DST_FIAT_SHAMIR, msg);
    expect(s1).toBe(s2);
    expect(s1).toBeLessThan(Q);
  });

  it('separates domains: different DST or different message ⇒ different scalar', () => {
    const a = hashToScalar(DST_FIAT_SHAMIR, new Uint8Array([1]));
    const b = hashToScalar(DST_FIAT_SHAMIR, new Uint8Array([2]));
    const c = hashToScalar(new TextEncoder().encode('OTHER-DST'), new Uint8Array([1]));
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it('concatenation matters: part ordering affects the output', () => {
    const a = hashToScalar(DST_FIAT_SHAMIR, new Uint8Array([1]), new Uint8Array([2]));
    const b = hashToScalar(DST_FIAT_SHAMIR, new Uint8Array([1, 2]));
    // Both hash over a concatenated preimage, so (part0 || part1) and
    // (single part0+part1) produce the same scalar.
    expect(a).toBe(b);
    const c = hashToScalar(DST_FIAT_SHAMIR, new Uint8Array([2]), new Uint8Array([1]));
    expect(a).not.toBe(c);
  });
});
