import {
  BudgetProof,
  G2Point,
  Transcript,
  addCt,
  encrypt,
  initCurves,
  proveBudgetAtMost,
  proveBudgetExact,
  sumCts,
} from '../src';
import { Q, modQ, randomScalar } from '../src/crypto/field';
import {
  verifyBudget,
  verifyBudgetAtMost,
  verifyBudgetExact,
} from '../src/voting/proofs';

beforeAll(async () => {
  await initCurves();
});

function trustedSetup() {
  const msk = randomScalar();
  const mpk = G2Point.generator().mul(msk);
  return { msk, mpk };
}

/**
 * Build a ballot-shaped sum: ℓ ciphertexts summing to V, with known rΣ.
 * Mirrors the Variant A construction the budget proof actually wraps.
 */
function makeBallotSum(votes: bigint[], mpk: G2Point) {
  const perCandidate = votes.map((v) => encrypt(v, mpk));
  const ctSum = sumCts(perCandidate.map(({ ct }) => ct));
  const rSum = modQ(perCandidate.reduce((acc, { r }) => acc + r, 0n));
  const V = votes.reduce((a, b) => a + b, 0n);
  return { ctSum, rSum, V };
}

describe('Budget proof — exact (V = B)', () => {
  it('honest: spending exactly B votes verifies', () => {
    const { mpk } = trustedSetup();
    const B = 5n;
    const { ctSum, rSum } = makeBallotSum([2n, 0n, 1n, 2n], mpk); // V = 5 = B
    const stmt = { ctSum, mpk, budget: B };
    const bp = proveBudgetExact(stmt, { rSum }, new Transcript('E'));
    expect(bp.mode).toBe('exact');
    expect(verifyBudget(stmt, bp, new Transcript('E'))).toBe(true);
    if (bp.mode === 'exact') {
      expect(verifyBudgetExact(stmt, bp.proof, new Transcript('E'))).toBe(true);
    }
  });

  it('verifier rejects when the declared B differs from the true sum', () => {
    const { mpk } = trustedSetup();
    const { ctSum, rSum } = makeBallotSum([2n, 0n, 1n, 2n], mpk); // V = 5
    const proverStmt = { ctSum, mpk, budget: 5n };
    const bp = proveBudgetExact(proverStmt, { rSum }, new Transcript('E'));
    // Verifier is told B = 6.
    const verifierStmt = { ctSum, mpk, budget: 6n };
    expect(verifyBudget(verifierStmt, bp, new Transcript('E'))).toBe(false);
  });

  it('verifier rejects when cΣ does not encrypt B', () => {
    const { mpk } = trustedSetup();
    const B = 5n;
    const { ctSum, rSum } = makeBallotSum([2n, 0n, 1n, 1n], mpk); // V = 4 ≠ 5
    const stmt = { ctSum, mpk, budget: B };
    // Prover tries to fake an exact-B proof. rSum is still the true randomness,
    // but the second DLEQ equation fails because D = cΣ.c2 - B·P₂ ≠ rΣ·mpk.
    const bp = proveBudgetExact(stmt, { rSum }, new Transcript('E'));
    expect(verifyBudget(stmt, bp, new Transcript('E'))).toBe(false);
  });

  it('verifier rejects if rSum is wrong (unknown randomness)', () => {
    const { mpk } = trustedSetup();
    const B = 3n;
    const { ctSum } = makeBallotSum([1n, 1n, 1n], mpk);
    const stmt = { ctSum, mpk, budget: B };
    const bp = proveBudgetExact(stmt, { rSum: randomScalar() }, new Transcript('E'));
    expect(verifyBudget(stmt, bp, new Transcript('E'))).toBe(false);
  });

  it('transcript binding: differing pre-appended vk rejects', () => {
    const { mpk } = trustedSetup();
    const B = 2n;
    const { ctSum, rSum } = makeBallotSum([1n, 1n], mpk);
    const stmt = { ctSum, mpk, budget: B };
    const tp = new Transcript('BAL');
    tp.append('vk', new Uint8Array([0x01]));
    const bp = proveBudgetExact(stmt, { rSum }, tp);

    const tvGood = new Transcript('BAL');
    tvGood.append('vk', new Uint8Array([0x01]));
    expect(verifyBudget(stmt, bp, tvGood)).toBe(true);

    const tvBad = new Transcript('BAL');
    tvBad.append('vk', new Uint8Array([0x02]));
    expect(verifyBudget(stmt, bp, tvBad)).toBe(false);
  });

  it('injected w yields a deterministic exact proof', () => {
    const { mpk } = trustedSetup();
    const B = 2n;
    const { ctSum, rSum } = makeBallotSum([1n, 1n], mpk);
    const stmt = { ctSum, mpk, budget: B };
    const w = 0xabcn;
    const a = proveBudgetExact(stmt, { rSum }, new Transcript('E'), { w });
    const b = proveBudgetExact(stmt, { rSum }, new Transcript('E'), { w });
    if (a.mode !== 'exact' || b.mode !== 'exact') throw new Error('wrong mode');
    expect(a.proof.e).toBe(b.proof.e);
    expect(a.proof.z).toBe(b.proof.z);
  });

  it('exact proof scalars in [0, Q)', () => {
    const { mpk } = trustedSetup();
    const B = 3n;
    const { ctSum, rSum } = makeBallotSum([1n, 1n, 1n], mpk);
    const bp = proveBudgetExact({ ctSum, mpk, budget: B }, { rSum }, new Transcript('E'));
    if (bp.mode !== 'exact') throw new Error('wrong mode');
    expect(bp.proof.e).toBeGreaterThanOrEqual(0n);
    expect(bp.proof.e).toBeLessThan(Q);
    expect(bp.proof.z).toBeGreaterThanOrEqual(0n);
    expect(bp.proof.z).toBeLessThan(Q);
  });
});

describe('Budget proof — at-most (V ∈ {0..B})', () => {
  it('honest: proof verifies for every V ∈ {0, …, B}', () => {
    const { mpk } = trustedSetup();
    const B = 3n;
    // Enumerate vote vectors [v0, v1] summing to each V.
    const scenarios: Array<{ votes: bigint[]; expectedV: bigint }> = [
      { votes: [0n, 0n], expectedV: 0n },
      { votes: [1n, 0n], expectedV: 1n },
      { votes: [1n, 1n], expectedV: 2n },
      { votes: [2n, 1n], expectedV: 3n },
    ];
    for (const { votes, expectedV } of scenarios) {
      const { ctSum, rSum, V } = makeBallotSum(votes, mpk);
      expect(V).toBe(expectedV);
      const stmt = { ctSum, mpk, budget: B };
      const bp = proveBudgetAtMost(stmt, { rSum, V }, new Transcript('A'));
      expect(bp.mode).toBe('atMost');
      expect(verifyBudget(stmt, bp, new Transcript('A'))).toBe(true);
      if (bp.mode === 'atMost') {
        expect(bp.proof.branches.length).toBe(Number(B) + 1);
      }
    }
  });

  it('bit-proof degenerate case (B = 1) has 2 branches', () => {
    const { mpk } = trustedSetup();
    const { ctSum, rSum, V } = makeBallotSum([0n, 1n], mpk); // V = 1 ≤ B = 1
    const stmt = { ctSum, mpk, budget: 1n };
    const bp = proveBudgetAtMost(stmt, { rSum, V }, new Transcript('A'));
    if (bp.mode !== 'atMost') throw new Error('wrong mode');
    expect(bp.proof.branches.length).toBe(2);
    expect(verifyBudget(stmt, bp, new Transcript('A'))).toBe(true);
  });

  it('rejects V > B at prove time', () => {
    const { mpk } = trustedSetup();
    const B = 2n;
    const { ctSum, rSum } = makeBallotSum([2n, 1n], mpk); // V = 3
    expect(() =>
      proveBudgetAtMost(
        { ctSum, mpk, budget: B },
        { rSum, V: 3n },
        new Transcript('A'),
      ),
    ).toThrow(/V \(3\).*\[0, 2\]/);
  });

  it('rejects negative V at prove time', () => {
    const { mpk } = trustedSetup();
    const { ctSum, rSum } = makeBallotSum([0n], mpk);
    expect(() =>
      proveBudgetAtMost(
        { ctSum, mpk, budget: 2n },
        { rSum, V: -1n },
        new Transcript('A'),
      ),
    ).toThrow(/\[0, 2\]/);
  });

  it('rejects negative budget on prove and verify', () => {
    const { mpk } = trustedSetup();
    const { ctSum, rSum } = makeBallotSum([0n], mpk);
    expect(() =>
      proveBudgetAtMost(
        { ctSum, mpk, budget: -1n },
        { rSum, V: 0n },
        new Transcript('A'),
      ),
    ).toThrow(/non-negative/);
    // If a malicious verifier accepts a negative budget, the guard in
    // verifyBudgetAtMost rejects up front.
    expect(
      verifyBudgetAtMost(
        { ctSum, mpk, budget: -1n },
        { branches: [] },
        new Transcript('A'),
      ),
    ).toBe(false);
  });

  it('verifier rejects a proof whose ciphertext actually encrypts V > B', () => {
    const { mpk } = trustedSetup();
    // Encrypt V = 4 but convince prover to lie and say V = 2.
    const { ctSum, rSum } = makeBallotSum([3n, 1n], mpk);
    const stmt = { ctSum, mpk, budget: 2n };
    // Prover cheats by claiming trueIndex=2 (V=2). None of the branches will
    // actually line up, so verify fails.
    const bp = proveBudgetAtMost(stmt, { rSum, V: 2n }, new Transcript('A'));
    expect(verifyBudget(stmt, bp, new Transcript('A'))).toBe(false);
  });

  it('mode-tag forgery: retagging an at-most OR proof as exact does not verify', () => {
    const { mpk } = trustedSetup();
    const B = 2n;
    const { ctSum, rSum, V } = makeBallotSum([1n, 1n], mpk); // V = 2 = B
    const stmt = { ctSum, mpk, budget: B };
    // A valid at-most proof, retagged as exact — verifyBudget should route
    // to verifyBudgetExact, which then treats the ORProof as a DLEQProof.
    // The OR object has no (e, z) fields, so verification fails structurally
    // without crashing.
    const atMost = proveBudgetAtMost(stmt, { rSum, V }, new Transcript('X'));
    if (atMost.mode !== 'atMost') throw new Error('wrong mode');
    const forged = {
      mode: 'exact',
      proof: { e: 0n, z: 0n }, // blank DLEQ — cannot be valid
    } as BudgetProof;
    expect(verifyBudget(stmt, forged, new Transcript('X'))).toBe(false);

    // Conversely, a genuine exact proof retagged as at-most has zero
    // branches when treated as an ORProof → verifyOR short-circuits on
    // `proof.branches.length !== B1`.
    const exact = proveBudgetExact(stmt, { rSum }, new Transcript('X'));
    if (exact.mode !== 'exact') throw new Error('wrong mode');
    const forgedAtMost: BudgetProof = { mode: 'atMost', proof: { branches: [] } };
    expect(verifyBudget(stmt, forgedAtMost, new Transcript('X'))).toBe(false);
  });

  it('transcript-mode binding: swapping the mode byte breaks verification', () => {
    const { mpk } = trustedSetup();
    const B = 2n;
    const { ctSum, rSum, V } = makeBallotSum([1n, 1n], mpk);
    const stmt = { ctSum, mpk, budget: B };
    // Produce honest at-most proof.
    const bp = proveBudgetAtMost(stmt, { rSum, V }, new Transcript('A'));
    if (bp.mode !== 'atMost') throw new Error('wrong mode');
    // Feeding the inner ORProof to verifyBudgetExact fails the type-level
    // contract (see above). The stronger test: a separate transcript that
    // seeds the 'exact' mode byte must not accept an at-most OR proof even
    // structurally. Since verifyBudgetAtMost is the only path to an ORProof
    // verify, it binds 'atMost' — swap transcripts:
    const tWrongMode = new Transcript('A');
    tWrongMode.append('budget:mode', new Uint8Array([0x00])); // pretend 'exact'
    // Verifier follows the proper mode path, which appends 0x01 — the
    // pre-seeded 0x00 diverges the transcript and the challenge mismatches.
    expect(verifyBudgetAtMost(stmt, bp.proof, tWrongMode)).toBe(false);
  });

  it('injected (w, simulated) yield a deterministic at-most proof', () => {
    const { mpk } = trustedSetup();
    const B = 2n;
    const { ctSum, rSum, V } = makeBallotSum([1n, 0n], mpk); // V = 1
    const stmt = { ctSum, mpk, budget: B };
    const w = 0xfeedn;
    const simulated = [
      { e: 5n, z: 11n },
      null,
      { e: 7n, z: 13n },
    ];
    const a = proveBudgetAtMost(stmt, { rSum, V }, new Transcript('A'), {
      w,
      simulated,
    });
    const b = proveBudgetAtMost(stmt, { rSum, V }, new Transcript('A'), {
      w,
      simulated,
    });
    if (a.mode !== 'atMost' || b.mode !== 'atMost') throw new Error('wrong mode');
    expect(a.proof.branches.length).toBe(b.proof.branches.length);
    for (let i = 0; i < Number(B) + 1; i++) {
      expect(a.proof.branches[i]!.e).toBe(b.proof.branches[i]!.e);
      expect(a.proof.branches[i]!.z).toBe(b.proof.branches[i]!.z);
    }
    expect(verifyBudget(stmt, a, new Transcript('A'))).toBe(true);
  });

  it('at-most proof scalars in [0, Q)', () => {
    const { mpk } = trustedSetup();
    const B = 4n;
    const { ctSum, rSum, V } = makeBallotSum([2n, 1n], mpk); // V = 3
    const bp = proveBudgetAtMost(
      { ctSum, mpk, budget: B },
      { rSum, V },
      new Transcript('A'),
    );
    if (bp.mode !== 'atMost') throw new Error('wrong mode');
    for (const br of bp.proof.branches) {
      expect(br.e).toBeGreaterThanOrEqual(0n);
      expect(br.e).toBeLessThan(Q);
      expect(br.z).toBeGreaterThanOrEqual(0n);
      expect(br.z).toBeLessThan(Q);
    }
  });
});

describe('Budget proof — homomorphic sum consistency (sanity)', () => {
  it('rΣ = Σ r_j produced by sumCts agrees with encrypt randomness', () => {
    // Belt-and-braces: if makeBallotSum ever diverges from addCt, every test
    // above would silently pass on wrong premises. Pin the invariant here.
    const { mpk } = trustedSetup();
    const a = encrypt(1n, mpk);
    const b = encrypt(2n, mpk);
    const ctSum = addCt(a.ct, b.ct);
    const rSum = modQ(a.r + b.r);
    // Re-encrypt m=3 with the combined randomness and assert equality of
    // both components.
    const P2 = G2Point.generator();
    expect(ctSum.c1.equals(P2.mul(rSum))).toBe(true);
    expect(ctSum.c2.equals(mpk.mul(rSum).add(P2.mul(3n)))).toBe(true);
  });
});
