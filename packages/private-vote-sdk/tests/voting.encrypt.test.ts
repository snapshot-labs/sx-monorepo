import { G2Point, initCurves } from '../src';
import { randomScalar } from '../src/crypto/field';
import {
  encrypt,
  addCt,
  scalarMulCt,
  sumCts,
} from '../src/voting/encrypt';
import type { Ciphertext } from '../src/voting/types';

beforeAll(async () => {
  await initCurves();
});

/**
 * Trusted single-keyper decryption helper — for P2 tests only. Stands in
 * for the threshold committee that will be split out properly in P5 (DKG
 * stubbed + Shamir combine + BSGS discrete log recovery).
 */
function trivialTrustedSetup(): { msk: bigint; mpk: G2Point } {
  const msk = randomScalar();
  const mpk = G2Point.generator().mul(msk);
  return { msk, mpk };
}

function trivialDecrypt(ct: Ciphertext, msk: bigint, upperBound: bigint): bigint {
  const sigma = ct.c1.mul(msk);
  const tau = ct.c2.sub(sigma);
  const P2 = G2Point.generator();
  let acc = G2Point.identity();
  for (let m = 0n; m <= upperBound; m++) {
    if (acc.equals(tau)) return m;
    acc = acc.add(P2);
  }
  throw new Error(`trivialDecrypt: no m ≤ ${upperBound} satisfies τ = m·P₂`);
}

describe('ElGamal encrypt', () => {
  it('Enc(m) decrypts to m under the trivial single-keyper setup', () => {
    const { msk, mpk } = trivialTrustedSetup();
    for (const m of [0n, 1n, 5n, 42n]) {
      const { ct } = encrypt(m, mpk);
      expect(trivialDecrypt(ct, msk, 100n)).toBe(m);
    }
  });

  it('encrypt returns the randomness r that was used for C1', () => {
    const { mpk } = trivialTrustedSetup();
    const { ct, r } = encrypt(7n, mpk);
    // C1 must equal r · P₂
    expect(ct.c1.equals(G2Point.generator().mul(r))).toBe(true);
  });

  it('fresh encryptions of the same m differ (r is sampled per call)', () => {
    const { mpk } = trivialTrustedSetup();
    const a = encrypt(3n, mpk);
    const b = encrypt(3n, mpk);
    expect(a.ct.c1.equals(b.ct.c1)).toBe(false);
    expect(a.ct.c2.equals(b.ct.c2)).toBe(false);
    expect(a.r).not.toBe(b.r);
  });

  it('encrypt with injected r is deterministic in (m, r)', () => {
    const { mpk } = trivialTrustedSetup();
    const r = 0xc0ffeen;
    const a = encrypt(9n, mpk, r);
    const b = encrypt(9n, mpk, r);
    expect(a.ct.c1.equals(b.ct.c1)).toBe(true);
    expect(a.ct.c2.equals(b.ct.c2)).toBe(true);
    expect(a.r).toBe(r);
    expect(b.r).toBe(r);
  });
});

describe('Homomorphic evaluation', () => {
  it('addCt: Enc(m₁) + Enc(m₂) decrypts to m₁ + m₂', () => {
    const { msk, mpk } = trivialTrustedSetup();
    const { ct: c1 } = encrypt(4n, mpk);
    const { ct: c2 } = encrypt(9n, mpk);
    expect(trivialDecrypt(addCt(c1, c2), msk, 50n)).toBe(13n);
  });

  it('scalarMulCt: k · Enc(m) decrypts to k·m', () => {
    const { msk, mpk } = trivialTrustedSetup();
    const { ct } = encrypt(3n, mpk);
    expect(trivialDecrypt(scalarMulCt(5n, ct), msk, 100n)).toBe(15n);
  });

  it('scalarMulCt reconstructs Variant-B candidate ciphertext from bit ciphertexts', () => {
    // Simulate Variant B with B = 7 (d = 3 bits). Vote value 5 = 0b101.
    const { msk, mpk } = trivialTrustedSetup();
    const bits = [1n, 0n, 1n]; // LSB first → 1 + 0 + 4 = 5
    const bitCts = bits.map((b) => encrypt(b, mpk).ct);
    const candidate = bitCts
      .map((ct, k) => scalarMulCt(1n << BigInt(k), ct))
      .reduce((a, b) => addCt(a, b));
    expect(trivialDecrypt(candidate, msk, 100n)).toBe(5n);
  });

  it('sumCts aggregates a batch of ciphertexts correctly', () => {
    const { msk, mpk } = trivialTrustedSetup();
    const values = [1n, 2n, 3n, 4n, 5n];
    const total = values.reduce((a, b) => a + b);
    const cts = values.map((v) => encrypt(v, mpk).ct);
    expect(trivialDecrypt(sumCts(cts), msk, 50n)).toBe(total);
  });

  it('sumCts on empty input returns encryption of 0', () => {
    const { msk } = trivialTrustedSetup();
    const empty = sumCts([]);
    // Both components are the identity, so τ = 0·P₂ = identity ⇒ m = 0.
    expect(trivialDecrypt(empty, msk, 1n)).toBe(0n);
  });

  it('simulated tally: multiple voters, per-candidate aggregation', () => {
    // ℓ = 3 candidates, 5 voters each with 1 vote for a single candidate.
    const { msk, mpk } = trivialTrustedSetup();
    const ballots: bigint[][] = [
      [1n, 0n, 0n],
      [0n, 1n, 0n],
      [0n, 0n, 1n],
      [1n, 0n, 0n],
      [0n, 1n, 0n],
    ];
    const expected = [2n, 2n, 1n];
    const perCandidate = [0, 1, 2].map((j) =>
      sumCts(ballots.map((b) => encrypt(b[j]!, mpk).ct)),
    );
    for (let j = 0; j < 3; j++) {
      expect(trivialDecrypt(perCandidate[j]!, msk, 10n)).toBe(expected[j]);
    }
  });
});
