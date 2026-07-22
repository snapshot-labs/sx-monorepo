/**
 * Shared ballot-assembly helper for benchmarks. Mirrors the frontend
 * pattern used in tests/voting.verify.test.ts so the bench measures the
 * same code paths a consumer would run.
 */

import { keccak256 } from 'viem';
import {
  BallotInputs,
  BallotValidityProof,
  BallotVerifyParams,
  G2Point,
  canonicalBallotMessage,
  encodeBallotValidityProof,
  encodeSchnorr,
  encrypt,
  proveBudgetAtMost,
  proveBudgetExact,
  proveOR,
  rangeCandidates,
  schnorrKeygen,
  schnorrSign,
  seedBallotTranscript,
  sumCts,
} from '../../src';

function u16BE(n: number): Uint8Array {
  const o = new Uint8Array(2);
  o[0] = (n >>> 8) & 0xff;
  o[1] = n & 0xff;
  return o;
}

export function buildBallot(args: {
  mpk: G2Point;
  electionId: Uint8Array;
  pseudonym: Uint8Array;
  votes: bigint[];
  params: BallotVerifyParams;
}): { inputs: BallotInputs; bvp: BallotValidityProof } {
  const { mpk, electionId, pseudonym, votes, params } = args;
  const { sk, vk } = schnorrKeygen();

  let cts: { c1: G2Point; c2: G2Point }[];
  let rs: bigint[];
  if (params.variant === 'A') {
    const perCand = votes.map((v) => encrypt(v, mpk));
    cts = perCand.map((p) => p.ct);
    rs = perCand.map((p) => p.r);
  } else {
    const d = params.d!;
    cts = [];
    rs = [];
    for (let j = 0; j < votes.length; j++) {
      const v = votes[j]!;
      for (let k = 0; k < d; k++) {
        const bit = Number((v >> BigInt(k)) & 1n);
        const { ct, r } = encrypt(BigInt(bit), mpk);
        cts.push(ct);
        rs.push(r);
      }
    }
  }

  const t = seedBallotTranscript(electionId, mpk, vk, cts, params);

  let rangeOrBit;
  if (params.variant === 'A') {
    const candidates = rangeCandidates(params.budget);
    rangeOrBit = cts.map((ct, j) => {
      t.append('ballot:range', u16BE(j));
      return proveOR(
        { ct, mpk, candidates },
        { r: rs[j]!, trueIndex: Number(votes[j]!) },
        t,
      );
    });
  } else {
    const d = params.d!;
    rangeOrBit = [];
    for (let jk = 0; jk < cts.length; jk++) {
      const j = Math.floor(jk / d);
      const k = jk % d;
      const bit = Number((votes[j]! >> BigInt(k)) & 1n) as 0 | 1;
      t.append('ballot:bit', u16BE(jk));
      rangeOrBit.push(
        proveOR(
          { ct: cts[jk]!, mpk, candidates: [0n, 1n] },
          { r: rs[jk]!, trueIndex: bit },
          t,
        ),
      );
    }
  }

  let ctSum: { c1: G2Point; c2: G2Point };
  let rSum: bigint;
  if (params.variant === 'A') {
    ctSum = sumCts(cts);
    rSum = rs.reduce((a, r) => a + r, 0n);
  } else {
    const d = params.d!;
    const weighted = cts.map((ct, i) => ({ ct, r: rs[i]!, w: 1n << BigInt(i % d) }));
    ctSum = weighted
      .map(({ ct, w }) => ({ c1: ct.c1.mul(w), c2: ct.c2.mul(w) }))
      .reduce((acc, cur) => ({
        c1: acc.c1.add(cur.c1),
        c2: acc.c2.add(cur.c2),
      }));
    rSum = weighted.reduce((a, { r, w }) => a + r * w, 0n);
  }

  const V = votes.reduce((a, b) => a + b, 0n);
  t.append('ballot:budget', new Uint8Array([0]));
  const budget =
    params.mode === 'exact'
      ? proveBudgetExact({ ctSum, mpk, budget: BigInt(params.budget) }, { rSum }, t)
      : proveBudgetAtMost(
          { ctSum, mpk, budget: BigInt(params.budget) },
          { rSum, V },
          t,
        );

  const bvp: BallotValidityProof = {
    version: 0x01,
    variant: params.variant,
    rangeOrBit,
    budget,
  };
  const zkProof = encodeBallotValidityProof(bvp);

  const ciphertextBytes: [Uint8Array, Uint8Array][] = cts.map((ct) => [
    ct.c1.toBytes(),
    ct.c2.toBytes(),
  ]);
  const preimage = canonicalBallotMessage({
    electionId,
    pseudonym,
    ciphertexts: ciphertextBytes,
    zkProof,
  });
  const sig = schnorrSign(sk, vk, keccak256(preimage, 'bytes'));

  return {
    inputs: {
      electionId,
      pseudonym,
      vk: vk.toBytes(),
      ciphertexts: ciphertextBytes,
      zkProof,
      voterSignature: encodeSchnorr(sig),
      wrAttestation: new Uint8Array([0x01]),
    },
    bvp,
  };
}

export function ceilLog2(x: number): number {
  if (x <= 1) return 1;
  let b = 0;
  let n = x - 1;
  while (n > 0) {
    n >>>= 1;
    b++;
  }
  return b;
}

// Spread B across ℓ greedily so the sum exactly hits B.
export function distribute(budget: number, candidates: number): bigint[] {
  const out = new Array<bigint>(candidates).fill(0n);
  let remaining = budget;
  let i = 0;
  while (remaining > 0 && i < candidates) {
    out[i] = (out[i] ?? 0n) + 1n;
    remaining--;
    i = (i + 1) % candidates;
  }
  return out;
}
