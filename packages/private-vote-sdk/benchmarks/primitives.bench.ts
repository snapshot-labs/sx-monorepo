/**
 * Primitive-level benchmarks: encrypt, Schnorr, DLEQ, OR across branch
 * counts, budget (exact / atMost).
 *
 * Run with `npm run bench`. Results stream as median / p95 / mean in ms.
 */

import {
  G2Point,
  Transcript,
  encrypt,
  initCurves,
  proveOR,
  proveBudgetAtMost,
  proveBudgetExact,
  schnorrKeygen,
  schnorrSign,
  schnorrVerify,
  sumCts,
} from '../src';
import { randomScalar } from '../src/crypto/field';
import {
  proveDLEQ,
  verifyDLEQ,
  verifyOR,
  verifyBudget,
} from '../src/voting/proofs';
import { bench } from './lib/timer';

beforeAll(async () => {
  await initCurves();
});

function trustedSetup(): { msk: bigint; mpk: G2Point } {
  const msk = randomScalar();
  return { msk, mpk: G2Point.generator().mul(msk) };
}

describe('primitives', () => {
  it('encrypt / Schnorr / DLEQ', async () => {
    const { mpk } = trustedSetup();
    const { sk, vk } = schnorrKeygen();
    const msg = new Uint8Array(32).fill(0xab);

    await bench('encrypt(m=1, mpk)', { iterations: 100 }, () => {
      encrypt(1n, mpk);
    });

    await bench('schnorrSign', { iterations: 100 }, () => {
      schnorrSign(sk, vk, msg);
    });
    const sig = schnorrSign(sk, vk, msg);
    await bench('schnorrVerify', { iterations: 100 }, () => {
      schnorrVerify(vk, msg, sig);
    });

    // DLEQ on a canonical same-log instance.
    const x = randomScalar();
    const base1 = G2Point.generator();
    const point1 = base1.mul(x);
    const base2 = G2Point.generator().mul(randomScalar());
    const point2 = base2.mul(x);
    const stmt = { base1, point1, base2, point2 };
    await bench('proveDLEQ', { iterations: 100 }, () => {
      proveDLEQ(stmt, { x }, new Transcript('B'));
    });
    const p = proveDLEQ(stmt, { x }, new Transcript('B'));
    await bench('verifyDLEQ', { iterations: 100 }, () => {
      verifyDLEQ(stmt, p, new Transcript('B'));
    });
  });

  it('OR proof — prove/verify across candidate set sizes', async () => {
    const { mpk } = trustedSetup();
    for (const B of [1, 3, 7, 10]) {
      const candidates: bigint[] = [];
      for (let i = 0; i <= B; i++) candidates.push(BigInt(i));
      const { ct, r } = encrypt(1n, mpk);
      const stmt = { ct, mpk, candidates };
      await bench(
        `proveOR (${B + 1} branches)`,
        { iterations: 30 },
        () => {
          proveOR(stmt, { r, trueIndex: 1 }, new Transcript('B'));
        },
      );
      const proof = proveOR(stmt, { r, trueIndex: 1 }, new Transcript('B'));
      await bench(
        `verifyOR (${B + 1} branches)`,
        { iterations: 30 },
        () => {
          verifyOR(stmt, proof, new Transcript('B'));
        },
      );
    }
  });

  it('budget proofs', async () => {
    const { mpk } = trustedSetup();
    for (const B of [1, 3, 7, 10]) {
      // Build an aggregate ciphertext with V = B exactly (works for both modes).
      const votes: bigint[] = [];
      let remaining = B;
      while (remaining > 0) {
        const take = Math.min(remaining, 1);
        votes.push(BigInt(take));
        remaining -= take;
      }
      const perCand = votes.map((v) => encrypt(v, mpk));
      const cts = perCand.map((p) => p.ct);
      const rs = perCand.map((p) => p.r);
      const ctSum = cts.length === 1 ? cts[0]! : sumCts(cts);
      const rSum = rs.reduce((a, r) => a + r, 0n);

      const stmt = { ctSum, mpk, budget: BigInt(B) };
      await bench(
        `proveBudgetExact (B=${B})`,
        { iterations: 50 },
        () => {
          proveBudgetExact(stmt, { rSum }, new Transcript('B'));
        },
      );
      const bpx = proveBudgetExact(stmt, { rSum }, new Transcript('B'));
      await bench(
        `verifyBudget (exact, B=${B})`,
        { iterations: 50 },
        () => {
          verifyBudget(stmt, bpx, new Transcript('B'));
        },
      );

      await bench(
        `proveBudgetAtMost (B=${B})`,
        { iterations: 20 },
        () => {
          proveBudgetAtMost(stmt, { rSum, V: BigInt(B) }, new Transcript('B'));
        },
      );
      const bpa = proveBudgetAtMost(
        stmt,
        { rSum, V: BigInt(B) },
        new Transcript('B'),
      );
      await bench(
        `verifyBudget (atMost, B=${B})`,
        { iterations: 20 },
        () => {
          verifyBudget(stmt, bpa, new Transcript('B'));
        },
      );
    }
  });

  it('sumCts across voter counts', async () => {
    const { mpk } = trustedSetup();
    // Sizes kept modest: the blst WASM heap is fixed at 16MB and each G2
    // add clones a point in-heap, so large n × many iterations OOMs the
    // wasm module even though JS has plenty of headroom.
    for (const n of [50, 200]) {
      const cts = Array.from({ length: n }, () => encrypt(0n, mpk).ct);
      await bench(`sumCts (n=${n})`, { iterations: 5 }, () => {
        sumCts(cts);
      });
    }
  });
});
