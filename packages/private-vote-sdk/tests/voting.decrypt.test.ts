/**
 * P5 — decrypt side.
 *
 * Covers:
 *   - partialDecrypt / verifyDecryptionShare round-trip and every adversarial
 *     tamper path (σ, e, z, wrong committeePK, wrong keyperIndex binding).
 *   - combineShares correctness against a synthetic t-of-n polynomial, plus
 *     structural error cases (duplicate/zero α, length mismatch, empty).
 *   - recoverDiscreteLog / buildBabyStepTable / recoverDiscreteLogWithTable
 *     including boundary values and the "out of bound" rejection.
 *   - End-to-end tally flow: ℓ candidates, per-candidate homomorphic sum,
 *     t+1 keyper partial decryptions, verify → combine → BSGS → recover
 *     plaintext totals.
 */

import {
  type BabyStepTable,
  type Ciphertext,
  G2Point,
  Transcript,
  addCt,
  buildBabyStepTable,
  combineShares,
  encrypt,
  initCurves,
  partialDecrypt,
  recoverDiscreteLog,
  recoverDiscreteLogWithTable,
  sumCts,
  verifyDecryptionShare,
} from '../src';
import { Q, modQ, randomScalar } from '../src/crypto/field';

beforeAll(async () => {
  await initCurves();
});

// ----- Synthetic t-of-n DKG (for tests only — NOT exported from the SDK) -----

interface DKGSim {
  msk: bigint;
  mpk: G2Point;
  /** α_k = k+1 for k ∈ [0, n); Shamir evaluation points. */
  alphas: bigint[];
  /** msk_k = f(α_k). */
  msk_k: bigint[];
  /** mpk_k = msk_k · P₂. */
  mpk_k: G2Point[];
  /** polynomial coefficients c_0 = msk, c_1, ..., c_t. */
  coeffs: bigint[];
}

function simulateDKG(t: number, n: number): DKGSim {
  const coeffs: bigint[] = new Array(t + 1);
  for (let i = 0; i <= t; i++) coeffs[i] = randomScalar();
  const msk = coeffs[0]!;
  const P2 = G2Point.generator();
  const mpk = P2.mul(msk);
  const alphas: bigint[] = [];
  const msk_k: bigint[] = [];
  const mpk_k: G2Point[] = [];
  for (let k = 0; k < n; k++) {
    const a = BigInt(k + 1);
    alphas.push(a);
    // f(a) = Σ c_i · a^i
    let acc = 0n;
    let pow = 1n;
    for (let i = 0; i <= t; i++) {
      acc = modQ(acc + coeffs[i]! * pow);
      pow = modQ(pow * a);
    }
    msk_k.push(acc);
    mpk_k.push(P2.mul(acc));
  }
  return { msk, mpk, alphas, msk_k, mpk_k, coeffs };
}

// ---------- partialDecrypt / verifyDecryptionShare ----------

describe('partialDecrypt / verifyDecryptionShare', () => {
  it('honest share verifies', () => {
    const dkg = simulateDKG(1, 3);
    const { ct } = encrypt(7n, dkg.mpk);
    const tProve = new Transcript('dec-test');
    const share = partialDecrypt(ct, dkg.msk_k[0]!, dkg.mpk_k[0]!, 1, tProve);
    const tVerify = new Transcript('dec-test');
    expect(verifyDecryptionShare(ct, share, dkg.mpk_k[0]!, tVerify)).toBe(true);
  });

  it('σ = msk_k · C1 holds', () => {
    const dkg = simulateDKG(1, 3);
    const { ct } = encrypt(0n, dkg.mpk);
    const share = partialDecrypt(ct, dkg.msk_k[1]!, dkg.mpk_k[1]!, 2, new Transcript('x'));
    expect(share.sigma.equals(ct.c1.mul(dkg.msk_k[1]!))).toBe(true);
  });

  it('rejects a tampered σ', () => {
    const dkg = simulateDKG(1, 3);
    const { ct } = encrypt(3n, dkg.mpk);
    const share = partialDecrypt(ct, dkg.msk_k[0]!, dkg.mpk_k[0]!, 1, new Transcript('x'));
    const bad = { ...share, sigma: share.sigma.add(G2Point.generator()) };
    expect(verifyDecryptionShare(ct, bad, dkg.mpk_k[0]!, new Transcript('x'))).toBe(false);
  });

  it('rejects a tampered challenge e', () => {
    const dkg = simulateDKG(1, 3);
    const { ct } = encrypt(3n, dkg.mpk);
    const share = partialDecrypt(ct, dkg.msk_k[0]!, dkg.mpk_k[0]!, 1, new Transcript('x'));
    const bad = { ...share, proof: { ...share.proof, e: modQ(share.proof.e + 1n) } };
    expect(verifyDecryptionShare(ct, bad, dkg.mpk_k[0]!, new Transcript('x'))).toBe(false);
  });

  it('rejects a tampered response z', () => {
    const dkg = simulateDKG(1, 3);
    const { ct } = encrypt(3n, dkg.mpk);
    const share = partialDecrypt(ct, dkg.msk_k[0]!, dkg.mpk_k[0]!, 1, new Transcript('x'));
    const bad = { ...share, proof: { ...share.proof, z: modQ(share.proof.z + 1n) } };
    expect(verifyDecryptionShare(ct, bad, dkg.mpk_k[0]!, new Transcript('x'))).toBe(false);
  });

  it('rejects a share verified against the wrong committeePK', () => {
    const dkg = simulateDKG(1, 3);
    const { ct } = encrypt(3n, dkg.mpk);
    const share = partialDecrypt(ct, dkg.msk_k[0]!, dkg.mpk_k[0]!, 1, new Transcript('x'));
    // Another keyper's committee key
    expect(verifyDecryptionShare(ct, share, dkg.mpk_k[1]!, new Transcript('x'))).toBe(false);
  });

  it('rejects a keyperIndex binding mismatch', () => {
    const dkg = simulateDKG(1, 3);
    const { ct } = encrypt(3n, dkg.mpk);
    const share = partialDecrypt(ct, dkg.msk_k[0]!, dkg.mpk_k[0]!, 1, new Transcript('x'));
    const forged = { ...share, keyperIndex: 2 };
    expect(verifyDecryptionShare(ct, forged, dkg.mpk_k[0]!, new Transcript('x'))).toBe(false);
  });

  it('rejects out-of-range keyperIndex at verify time (shares are untrusted inputs)', () => {
    const dkg = simulateDKG(1, 3);
    const { ct } = encrypt(3n, dkg.mpk);
    const share = partialDecrypt(ct, dkg.msk_k[0]!, dkg.mpk_k[0]!, 1, new Transcript('x'));

    expect(
      verifyDecryptionShare(
        ct,
        { ...share, keyperIndex: 0 },
        dkg.mpk_k[0]!,
        new Transcript('x'),
      ),
    ).toBe(false);
    expect(
      verifyDecryptionShare(
        ct,
        { ...share, keyperIndex: 70000 },
        dkg.mpk_k[0]!,
        new Transcript('x'),
      ),
    ).toBe(false);
    expect(
      verifyDecryptionShare(
        ct,
        { ...share, keyperIndex: 1.5 as unknown as number },
        dkg.mpk_k[0]!,
        new Transcript('x'),
      ),
    ).toBe(false);
  });

  it('rejects verification with a different ciphertext', () => {
    const dkg = simulateDKG(1, 3);
    const { ct } = encrypt(3n, dkg.mpk);
    const { ct: ct2 } = encrypt(4n, dkg.mpk);
    const share = partialDecrypt(ct, dkg.msk_k[0]!, dkg.mpk_k[0]!, 1, new Transcript('x'));
    expect(verifyDecryptionShare(ct2, share, dkg.mpk_k[0]!, new Transcript('x'))).toBe(false);
  });

  it('rejects verification with a mismatched transcript label', () => {
    const dkg = simulateDKG(1, 3);
    const { ct } = encrypt(3n, dkg.mpk);
    const share = partialDecrypt(ct, dkg.msk_k[0]!, dkg.mpk_k[0]!, 1, new Transcript('A'));
    expect(verifyDecryptionShare(ct, share, dkg.mpk_k[0]!, new Transcript('B'))).toBe(false);
  });

  it('throws on out-of-range keyperIndex', () => {
    const dkg = simulateDKG(1, 3);
    const { ct } = encrypt(0n, dkg.mpk);
    expect(() =>
      partialDecrypt(ct, dkg.msk_k[0]!, dkg.mpk_k[0]!, 0, new Transcript('x')),
    ).toThrow(/keyperIndex/);
    expect(() =>
      partialDecrypt(ct, dkg.msk_k[0]!, dkg.mpk_k[0]!, 70000, new Transcript('x')),
    ).toThrow(/keyperIndex/);
  });
});

// ---------- combineShares ----------

describe('combineShares', () => {
  it('reconstructs τ = V · P₂ from t+1 shares', () => {
    const t = 2;
    const n = 5;
    const dkg = simulateDKG(t, n);
    const V = 9n;
    const { ct } = encrypt(V, dkg.mpk);
    // Pick shares 0, 2, 4 (indices 1, 3, 5).
    const picks = [0, 2, 4];
    const shares = picks.map((k) =>
      partialDecrypt(ct, dkg.msk_k[k]!, dkg.mpk_k[k]!, k + 1, new Transcript(`c${k}`)),
    );
    const alphas = picks.map((k) => dkg.alphas[k]!);
    const tau = combineShares(shares, alphas, ct);
    expect(tau.equals(G2Point.generator().mul(V))).toBe(true);
  });

  it('same answer regardless of which t+1 subset', () => {
    const t = 1;
    const n = 4;
    const dkg = simulateDKG(t, n);
    const V = 17n;
    const { ct } = encrypt(V, dkg.mpk);
    const allShares = dkg.msk_k.map((s, k) =>
      partialDecrypt(ct, s, dkg.mpk_k[k]!, k + 1, new Transcript('all')),
    );
    const subsetA = [0, 1].map((k) => allShares[k]!);
    const alphasA = [0, 1].map((k) => dkg.alphas[k]!);
    const subsetB = [1, 3].map((k) => allShares[k]!);
    const alphasB = [1, 3].map((k) => dkg.alphas[k]!);
    const tauA = combineShares(subsetA, alphasA, ct);
    const tauB = combineShares(subsetB, alphasB, ct);
    expect(tauA.equals(tauB)).toBe(true);
    expect(tauA.equals(G2Point.generator().mul(V))).toBe(true);
  });

  it('fewer than t+1 shares does NOT reconstruct (with overwhelming probability)', () => {
    const t = 2;
    const n = 5;
    const dkg = simulateDKG(t, n);
    const V = 3n;
    const { ct } = encrypt(V, dkg.mpk);
    // Use only 2 shares for a t=2 scheme (need 3).
    const picks = [0, 1];
    const shares = picks.map((k) =>
      partialDecrypt(ct, dkg.msk_k[k]!, dkg.mpk_k[k]!, k + 1, new Transcript('u')),
    );
    const alphas = picks.map((k) => dkg.alphas[k]!);
    const tau = combineShares(shares, alphas, ct);
    expect(tau.equals(G2Point.generator().mul(V))).toBe(false);
  });

  it('rejects length mismatch', () => {
    const dkg = simulateDKG(1, 3);
    const { ct } = encrypt(1n, dkg.mpk);
    const share = partialDecrypt(ct, dkg.msk_k[0]!, dkg.mpk_k[0]!, 1, new Transcript('x'));
    expect(() => combineShares([share], [], ct)).toThrow(/length/);
    expect(() => combineShares([share], [1n, 2n], ct)).toThrow(/length/);
  });

  it('rejects empty share set', () => {
    const dkg = simulateDKG(1, 3);
    const { ct } = encrypt(1n, dkg.mpk);
    expect(() => combineShares([], [], ct)).toThrow(/at least one/);
  });

  it('rejects duplicate evaluation points', () => {
    const dkg = simulateDKG(1, 3);
    const { ct } = encrypt(1n, dkg.mpk);
    // Two shares with the same keyperIndex → the new α === keyperIndex
    // check passes (both α = 3), and the duplicate-alpha check fires.
    const s0 = partialDecrypt(ct, dkg.msk_k[0]!, dkg.mpk_k[0]!, 3, new Transcript('x'));
    const s1 = partialDecrypt(ct, dkg.msk_k[1]!, dkg.mpk_k[1]!, 3, new Transcript('x'));
    expect(() => combineShares([s0, s1], [3n, 3n], ct)).toThrow(/duplicate/);
  });

  it('rejects zero evaluation point', () => {
    const dkg = simulateDKG(1, 3);
    const { ct } = encrypt(1n, dkg.mpk);
    const s0 = partialDecrypt(ct, dkg.msk_k[0]!, dkg.mpk_k[0]!, 1, new Transcript('x'));
    expect(() => combineShares([s0], [0n], ct)).toThrow(/is 0 mod Q/);
    expect(() => combineShares([s0], [Q], ct)).toThrow(/is 0 mod Q/); // Q ≡ 0
  });

  it('rejects α ≠ keyperIndex to prevent silent wrong-tally', () => {
    const dkg = simulateDKG(1, 3);
    const { ct } = encrypt(1n, dkg.mpk);
    const s0 = partialDecrypt(ct, dkg.msk_k[0]!, dkg.mpk_k[0]!, 1, new Transcript('x'));
    const s1 = partialDecrypt(ct, dkg.msk_k[1]!, dkg.mpk_k[1]!, 2, new Transcript('x'));
    // Valid individually, but permuted α — would Lagrange-interpolate to
    // the wrong polynomial without this guard.
    expect(() => combineShares([s0, s1], [2n, 1n], ct)).toThrow(/keyperIndex/);
  });
});

// ---------- recoverDiscreteLog (BSGS in G₂) ----------

describe('recoverDiscreteLog', () => {
  const P2 = () => G2Point.generator();

  it('recovers T = 0 (τ = identity)', () => {
    expect(recoverDiscreteLog(G2Point.identity(), 100n)).toBe(0n);
  });

  it('recovers T = 1', () => {
    expect(recoverDiscreteLog(P2(), 100n)).toBe(1n);
  });

  it('recovers T = upperBound exactly', () => {
    const N = 73n;
    expect(recoverDiscreteLog(P2().mul(N), N)).toBe(N);
  });

  it('recovers a range of Ts', () => {
    const N = 200n;
    for (const T of [0n, 1n, 2n, 15n, 99n, 100n, 101n, 199n, 200n]) {
      const tau = P2().mul(T);
      expect(recoverDiscreteLog(tau, N)).toBe(T);
    }
  });

  it('throws when τ corresponds to a T > upperBound', () => {
    const tau = P2().mul(500n);
    expect(() => recoverDiscreteLog(tau, 100n)).toThrow(/exceeded the declared bound/);
  });

  it('rejects a negative upper bound', () => {
    expect(() => recoverDiscreteLog(G2Point.identity(), -1n)).toThrow(/non-negative/);
  });

  it('handles upperBound = 0', () => {
    expect(recoverDiscreteLog(G2Point.identity(), 0n)).toBe(0n);
    expect(() => recoverDiscreteLog(P2(), 0n)).toThrow(/exceeded the declared bound/);
  });
});

describe('buildBabyStepTable + recoverDiscreteLogWithTable', () => {
  it('reuses a table across multiple recoveries', () => {
    const N = 10_000n;
    const table: BabyStepTable = buildBabyStepTable(N);
    const P2 = G2Point.generator();
    for (const T of [0n, 42n, 9999n, 10000n]) {
      expect(recoverDiscreteLogWithTable(P2.mul(T), table)).toBe(T);
    }
  });

  it('table from the top-level helper matches the low-level one', () => {
    const N = 50n;
    const table = buildBabyStepTable(N);
    for (const T of [0n, 7n, 50n]) {
      const tau = G2Point.generator().mul(T);
      expect(recoverDiscreteLogWithTable(tau, table)).toBe(recoverDiscreteLog(tau, N));
    }
  });
});

// ---------- End-to-end tally ----------

describe('end-to-end tally (encrypt → sum → partial → verify → combine → recover)', () => {
  it('recovers per-candidate totals for a small election', () => {
    const t = 2;
    const n = 5;
    const ℓ = 4;
    const B = 3;
    const numVoters = 6;
    const dkg = simulateDKG(t, n);

    // Voter j votes vector of length ℓ with entries in [0, B] summing ≤ B.
    // Pick simple deterministic vectors.
    const voters: bigint[][] = [
      [3n, 0n, 0n, 0n],
      [1n, 1n, 1n, 0n],
      [0n, 2n, 1n, 0n],
      [2n, 0n, 1n, 0n],
      [0n, 0n, 0n, 3n],
      [1n, 0n, 2n, 0n],
    ];
    expect(voters).toHaveLength(numVoters);

    // Per-candidate expected total.
    const expected: bigint[] = new Array(ℓ).fill(0n);
    for (const v of voters) for (let j = 0; j < ℓ; j++) expected[j]! += v[j]!;

    // Encrypt every vote.
    const ctByCand: Ciphertext[][] = Array.from({ length: ℓ }, () => []);
    for (const v of voters) {
      for (let j = 0; j < ℓ; j++) {
        ctByCand[j]!.push(encrypt(v[j]!, dkg.mpk).ct);
      }
    }
    // Homomorphically aggregate per candidate.
    const ctSum: Ciphertext[] = ctByCand.map((cts) => sumCts(cts));

    // Pick a t+1-sized subset of keypers: {1, 3, 5}.
    const subset = [0, 2, 4];
    const alphas = subset.map((k) => dkg.alphas[k]!);
    const N = BigInt(numVoters * B); // safe upper bound
    const table = buildBabyStepTable(N);

    // Per candidate: every picked keyper partial-decrypts, all get verified,
    // then Lagrange-combine and BSGS to the plaintext total.
    for (let j = 0; j < ℓ; j++) {
      const shares = subset.map((k) => {
        const s = partialDecrypt(
          ctSum[j]!,
          dkg.msk_k[k]!,
          dkg.mpk_k[k]!,
          k + 1,
          new Transcript(`tally:${j}:${k + 1}`),
        );
        // Verifier uses the same seed.
        const ok = verifyDecryptionShare(
          ctSum[j]!,
          s,
          dkg.mpk_k[k]!,
          new Transcript(`tally:${j}:${k + 1}`),
        );
        expect(ok).toBe(true);
        return s;
      });

      const tau = combineShares(shares, alphas, ctSum[j]!);
      const V = recoverDiscreteLogWithTable(tau, table);
      expect(V).toBe(expected[j]);
    }
  });

  it('addCt + recover agrees with encrypt of the sum', () => {
    // Sanity: addCt composes with decryption on single-voter toy data.
    const dkg = simulateDKG(0, 1); // trivial 1-of-1
    const { ct: ct1 } = encrypt(2n, dkg.mpk);
    const { ct: ct2 } = encrypt(5n, dkg.mpk);
    const ctSum = addCt(ct1, ct2);
    const share = partialDecrypt(ctSum, dkg.msk_k[0]!, dkg.mpk_k[0]!, 1, new Transcript('s'));
    expect(
      verifyDecryptionShare(ctSum, share, dkg.mpk_k[0]!, new Transcript('s')),
    ).toBe(true);
    const tau = combineShares([share], [dkg.alphas[0]!], ctSum);
    expect(recoverDiscreteLog(tau, 100n)).toBe(7n);
  });
});
