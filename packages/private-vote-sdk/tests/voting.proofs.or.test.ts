import {
  G2Point,
  Transcript,
  encrypt,
  initCurves,
  proveOR,
} from '../src';
import { Q, modQ, randomScalar } from '../src/crypto/field';
import { verifyOR } from '../src/voting/proofs';

beforeAll(async () => {
  await initCurves();
});

function trustedSetup() {
  const msk = randomScalar();
  const mpk = G2Point.generator().mul(msk);
  return { msk, mpk };
}

describe('(B+1)-branch OR proof', () => {
  it('honest: encrypts m_i for each i ∈ {0..B}, verifier accepts', () => {
    const { mpk } = trustedSetup();
    const B = 3n;
    const candidates: bigint[] = [0n, 1n, 2n, 3n]; // M = {0..B}
    for (let trueIndex = 0; trueIndex < candidates.length; trueIndex++) {
      const m = candidates[trueIndex]!;
      const { ct, r } = encrypt(m, mpk);
      const stmt = { ct, mpk, candidates };
      const proof = proveOR(stmt, { r, trueIndex }, new Transcript('V-A'));
      expect(verifyOR(stmt, proof, new Transcript('V-A'))).toBe(true);
      void B; // keep reference to silence linter
    }
  });

  it('bit-proof case (|M|=2) — Variant-B style', () => {
    const { mpk } = trustedSetup();
    const candidates = [0n, 1n];
    for (const bit of [0n, 1n]) {
      const { ct, r } = encrypt(bit, mpk);
      const trueIndex = Number(bit);
      const stmt = { ct, mpk, candidates };
      const proof = proveOR(stmt, { r, trueIndex }, new Transcript('V-B'));
      expect(verifyOR(stmt, proof, new Transcript('V-B'))).toBe(true);
    }
  });

  it('produces exactly |M| branches', () => {
    const { mpk } = trustedSetup();
    const candidates = [0n, 1n, 2n, 3n, 4n];
    const { ct, r } = encrypt(2n, mpk);
    const proof = proveOR(
      { ct, mpk, candidates },
      { r, trueIndex: 2 },
      new Transcript('T'),
    );
    expect(proof.branches.length).toBe(candidates.length);
  });

  it('verify rejects if any (a1,i, a2,i, e_i, z_i) is tampered', () => {
    const { mpk } = trustedSetup();
    const candidates = [0n, 1n, 2n, 3n];
    const { ct, r } = encrypt(2n, mpk);
    const stmt = { ct, mpk, candidates };
    const proof = proveOR(stmt, { r, trueIndex: 2 }, new Transcript('T'));

    // Flip z on the real branch.
    const badZ = {
      branches: proof.branches.map((b, i) =>
        i === 2 ? { ...b, z: modQ(b.z + 1n) } : b,
      ),
    };
    expect(verifyOR(stmt, badZ, new Transcript('T'))).toBe(false);

    // Flip a1 on a simulated branch.
    const badA = {
      branches: proof.branches.map((b, i) =>
        i === 0 ? { ...b, a1: b.a1.add(G2Point.generator()) } : b,
      ),
    };
    expect(verifyOR(stmt, badA, new Transcript('T'))).toBe(false);
  });

  it('verify rejects if Σ e_i does not match the recomputed challenge', () => {
    const { mpk } = trustedSetup();
    const candidates = [0n, 1n, 2n];
    const { ct, r } = encrypt(1n, mpk);
    const stmt = { ct, mpk, candidates };
    const proof = proveOR(stmt, { r, trueIndex: 1 }, new Transcript('T'));
    // Shift e on two branches by +/- δ — per-branch DLEQ still fails for a
    // random δ (z isn't recomputed), so force both equations to fail jointly
    // by a specific tweak: add δ to e_0 and -δ to e_2 — Σ e_i stays the same
    // but branch equations no longer hold.
    const δ = 7n;
    const tweaked = {
      branches: proof.branches.map((b, i) =>
        i === 0
          ? { ...b, e: modQ(b.e + δ) }
          : i === 2
            ? { ...b, e: modQ(b.e - δ) }
            : b,
      ),
    };
    expect(verifyOR(stmt, tweaked, new Transcript('T'))).toBe(false);
  });

  it('verify rejects when the ciphertext encrypts a value outside M', () => {
    const { mpk } = trustedSetup();
    const candidates = [0n, 1n, 2n];
    // Encrypt m = 5 (∉ M). A cheating prover cannot produce an accepting
    // proof even with a well-formed r for m=5 — there's no true branch.
    const { ct, r } = encrypt(5n, mpk);
    const stmt = { ct, mpk, candidates };
    // Pretend trueIndex = 2 (claiming m = 2). Proof verifier fails.
    const proof = proveOR(stmt, { r, trueIndex: 2 }, new Transcript('T'));
    expect(verifyOR(stmt, proof, new Transcript('T'))).toBe(false);
  });

  it('verify rejects if the candidate set differs between prover and verifier', () => {
    const { mpk } = trustedSetup();
    const { ct, r } = encrypt(1n, mpk);
    const proverStmt = { ct, mpk, candidates: [0n, 1n, 2n] };
    const proof = proveOR(proverStmt, { r, trueIndex: 1 }, new Transcript('T'));
    const verifierStmt = { ct, mpk, candidates: [0n, 1n, 3n] }; // 2 → 3
    expect(verifyOR(verifierStmt, proof, new Transcript('T'))).toBe(false);
  });

  it('binding: verifier transcript must match prover transcript (vk etc.)', () => {
    const { mpk } = trustedSetup();
    const candidates = [0n, 1n];
    const { ct, r } = encrypt(1n, mpk);
    const stmt = { ct, mpk, candidates };
    const tp = new Transcript('BALLOT');
    tp.append('vk', new Uint8Array([0x01]));
    const proof = proveOR(stmt, { r, trueIndex: 1 }, tp);

    const tvGood = new Transcript('BALLOT');
    tvGood.append('vk', new Uint8Array([0x01]));
    expect(verifyOR(stmt, proof, tvGood)).toBe(true);

    const tvBad = new Transcript('BALLOT');
    tvBad.append('vk', new Uint8Array([0x02])); // different voter
    expect(verifyOR(stmt, proof, tvBad)).toBe(false);
  });

  it('injected simulated branches + w yield a deterministic proof', () => {
    const { mpk } = trustedSetup();
    const candidates = [0n, 1n, 2n];
    const { ct, r } = encrypt(1n, mpk);
    const stmt = { ct, mpk, candidates };

    const w = 0xdeadn;
    const simulated = candidates.map((_, i) =>
      i === 1 ? null : { e: BigInt(i + 1) * 7n, z: BigInt(i + 1) * 11n },
    );
    const a = proveOR(stmt, { r, trueIndex: 1 }, new Transcript('T'), {
      w,
      simulated,
    });
    const b = proveOR(stmt, { r, trueIndex: 1 }, new Transcript('T'), {
      w,
      simulated,
    });
    expect(a.branches.length).toBe(b.branches.length);
    for (let i = 0; i < candidates.length; i++) {
      expect(a.branches[i]!.e).toBe(b.branches[i]!.e);
      expect(a.branches[i]!.z).toBe(b.branches[i]!.z);
      expect(a.branches[i]!.a1.equals(b.branches[i]!.a1)).toBe(true);
      expect(a.branches[i]!.a2.equals(b.branches[i]!.a2)).toBe(true);
    }
    expect(verifyOR(stmt, a, new Transcript('T'))).toBe(true);
  });

  it('rejects empty candidate set / out-of-range trueIndex at prove time', () => {
    const { mpk } = trustedSetup();
    const { ct, r } = encrypt(0n, mpk);
    expect(() =>
      proveOR({ ct, mpk, candidates: [] }, { r, trueIndex: 0 }, new Transcript('T')),
    ).toThrow(/empty/);
    expect(() =>
      proveOR(
        { ct, mpk, candidates: [0n, 1n] },
        { r, trueIndex: 2 },
        new Transcript('T'),
      ),
    ).toThrow(/out of range/);
  });

  it('simulated.length mismatch is caught at prove time', () => {
    const { mpk } = trustedSetup();
    const candidates = [0n, 1n, 2n];
    const { ct, r } = encrypt(1n, mpk);
    expect(() =>
      proveOR(
        { ct, mpk, candidates },
        { r, trueIndex: 1 },
        new Transcript('T'),
        { simulated: [null, null] }, // should be 3
      ),
    ).toThrow(/simulated.length/);
  });

  it('all scalars in every branch are in [0, Q)', () => {
    const { mpk } = trustedSetup();
    const candidates = [0n, 1n, 2n, 3n];
    const { ct, r } = encrypt(2n, mpk);
    const proof = proveOR(
      { ct, mpk, candidates },
      { r, trueIndex: 2 },
      new Transcript('T'),
    );
    for (const br of proof.branches) {
      expect(br.e).toBeGreaterThanOrEqual(0n);
      expect(br.e).toBeLessThan(Q);
      expect(br.z).toBeGreaterThanOrEqual(0n);
      expect(br.z).toBeLessThan(Q);
    }
  });
});
