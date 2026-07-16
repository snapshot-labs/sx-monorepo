import {
  G2Point,
  Transcript,
  encrypt,
  initCurves,
} from '../src';
import { Q, modQ, randomScalar } from '../src/crypto/field';
import { proveDLEQ, verifyDLEQ } from '../src/voting/proofs';

beforeAll(async () => {
  await initCurves();
});

/**
 * Canonical DLEQ instance: base1 = P₂, base2 = mpk; the shared discrete
 * log is the ciphertext randomness r, so point1 = r·P₂ = C1 and
 * point2 = r·mpk = C2 - m·P₂. This is the exact shape used by the
 * keyper decryption-share proof (Munich §6.3) and the exact-budget proof
 * (Munich §6.1.3), which is why it's worth testing head-on.
 */
function sameLogInstance() {
  const msk = randomScalar();
  const mpk = G2Point.generator().mul(msk);
  const { ct, r } = encrypt(3n, mpk);
  const P2 = G2Point.generator();
  return {
    stmt: {
      base1: P2,
      point1: ct.c1, // r·P₂
      base2: mpk,
      point2: ct.c2.sub(P2.mul(3n)), // = r·mpk
    },
    witness: { x: r },
  };
}

describe('DLEQ', () => {
  it('honest prove → verify round-trip', () => {
    const { stmt, witness } = sameLogInstance();
    const proof = proveDLEQ(stmt, witness, new Transcript('T'));
    expect(verifyDLEQ(stmt, proof, new Transcript('T'))).toBe(true);
  });

  it('verify rejects when the transcript label differs from the prover', () => {
    const { stmt, witness } = sameLogInstance();
    const proof = proveDLEQ(stmt, witness, new Transcript('A'));
    expect(verifyDLEQ(stmt, proof, new Transcript('B'))).toBe(false);
  });

  it('verify rejects when pre-appended binding data differs', () => {
    const { stmt, witness } = sameLogInstance();
    const vkBytes = new Uint8Array([0xde, 0xad]);
    const tp = new Transcript('L');
    tp.append('vk', vkBytes);
    const proof = proveDLEQ(stmt, witness, tp);

    const tv = new Transcript('L');
    tv.append('vk', new Uint8Array([0xbe, 0xef])); // different binding
    expect(verifyDLEQ(stmt, proof, tv)).toBe(false);
  });

  it('injected w is honoured and yields a valid proof', () => {
    const { stmt, witness } = sameLogInstance();
    const w = 0xc0ffeen;
    const a = proveDLEQ(stmt, witness, new Transcript('T'), { w });
    const b = proveDLEQ(stmt, witness, new Transcript('T'), { w });
    expect(a.e).toBe(b.e);
    expect(a.z).toBe(b.z);
    expect(verifyDLEQ(stmt, a, new Transcript('T'))).toBe(true);
  });

  it('tampering e or z breaks verification', () => {
    const { stmt, witness } = sameLogInstance();
    const proof = proveDLEQ(stmt, witness, new Transcript('T'));
    expect(
      verifyDLEQ(stmt, { e: modQ(proof.e + 1n), z: proof.z }, new Transcript('T')),
    ).toBe(false);
    expect(
      verifyDLEQ(stmt, { e: proof.e, z: modQ(proof.z + 1n) }, new Transcript('T')),
    ).toBe(false);
  });

  it('verify rejects a statement whose points do not share a discrete log', () => {
    // point1 = r·P₂, point2 = r'·mpk with r ≠ r'.
    const msk = randomScalar();
    const mpk = G2Point.generator().mul(msk);
    const P2 = G2Point.generator();
    const r = randomScalar();
    const rPrime = modQ(r + 1n);
    const stmt = {
      base1: P2,
      point1: P2.mul(r),
      base2: mpk,
      point2: mpk.mul(rPrime),
    };
    // Prover who thinks witness is r produces a proof that fails the second eq.
    const proof = proveDLEQ(stmt, { x: r }, new Transcript('T'));
    expect(verifyDLEQ(stmt, proof, new Transcript('T'))).toBe(false);
  });

  it('the response z lies in [0, Q) even after folding a large challenge', () => {
    const { stmt, witness } = sameLogInstance();
    for (let i = 0; i < 3; i++) {
      const p = proveDLEQ(stmt, witness, new Transcript('T'));
      expect(p.e).toBeGreaterThanOrEqual(0n);
      expect(p.e).toBeLessThan(Q);
      expect(p.z).toBeGreaterThanOrEqual(0n);
      expect(p.z).toBeLessThan(Q);
    }
  });
});
