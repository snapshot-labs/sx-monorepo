/**
 * End-to-end HL_ARC test (scaled): exercises Phases 0–5 of the Munich
 * protocol in one run. Voters build full ballots with Variant A validity
 * proofs, the Vote Proxy verifies each one, the tally aggregator sums
 * ciphertexts per candidate, t+1 keypers partial-decrypt + DLEQ, the
 * aggregator combines and BSGS-recovers the per-candidate totals.
 *
 * Dev plan §7.4 specifies `n=5, t=2, ℓ=15, B=10, p=100`. With real BLS
 * ops a single voter takes ~7s prove+verify at (ℓ=15, B=10), so running
 * p=100 in a normal Jest test is infeasible — the p=100 version lives
 * in benchmarks/e2e.bench.ts. This test keeps the shape but with p=10
 * so it finishes in well under the Jest timeout while still covering
 * every component in concert.
 */

import {
  BallotVerifyParams,
  Ciphertext,
  G2Point,
  Transcript,
  buildBabyStepTable,
  combineShares,
  initCurves,
  partialDecrypt,
  recoverDiscreteLogWithTable,
  sumCts,
  verifyBallot,
  verifyDecryptionShare,
} from '../src';
import { simulateDKG } from './lib/dkg';
import { buildBallot } from '../benchmarks/lib/ballot';

const accept = () => true;

// Bumped: (ℓ=15, B=10) prove+verify per voter ≈ 7s in plain BLS on
// laptop-class hardware; 10 voters plus aggregation needs 5+ minutes of
// headroom.
jest.setTimeout(600_000);

beforeAll(async () => {
  await initCurves();
});

describe('end-to-end HL_ARC (scaled, p=10)', () => {
  it('recovers per-candidate tallies through full ballot + threshold decrypt', () => {
    const n = 5;
    const t = 2;
    const ℓ = 15;
    const B = 10;
    const p = 10;

    const dkg = simulateDKG(t, n);
    const electionId = new Uint8Array(32).fill(0xe1);
    const params: BallotVerifyParams = {
      numCandidates: ℓ,
      budget: B,
      mode: 'atMost',
      variant: 'A',
    };

    // Deterministic vote vectors: voter v puts B into candidate (v mod ℓ),
    // or splits them when v even. Keeps the expected totals computable
    // without RNG while still giving every candidate some weight.
    function pickVotes(v: number): bigint[] {
      const out = new Array<bigint>(ℓ).fill(0n);
      if (v % 2 === 0) {
        out[v % ℓ] = BigInt(B);
      } else {
        out[v % ℓ] = BigInt(Math.floor(B / 2));
        out[(v + 1) % ℓ] = BigInt(B - Math.floor(B / 2));
      }
      return out;
    }

    const expected: bigint[] = new Array(ℓ).fill(0n);
    for (let v = 0; v < p; v++) {
      const votes = pickVotes(v);
      for (let j = 0; j < ℓ; j++) expected[j]! += votes[j]!;
    }

    // Phase 1-3: each voter builds + signs their ballot.
    // Phase 4a: Vote Proxy verifies each ballot.
    // Then append per-candidate ciphertexts into the aggregator's list.
    const ctByCand: Ciphertext[][] = Array.from({ length: ℓ }, () => []);
    for (let v = 0; v < p; v++) {
      const votes = pickVotes(v);
      const { inputs } = buildBallot({
        mpk: dkg.mpk,
        electionId,
        pseudonym: new Uint8Array(32).fill(v + 1),
        votes,
        params,
      });
      const r = verifyBallot(inputs, params, dkg.mpk, accept);
      expect(r).toEqual({ ok: true });

      // Parse ciphertext bytes back into points via the same path the
      // aggregator would use. verifyBallot already re-parsed them, but
      // for the tally we need the in-memory point form — easiest is to
      // re-encrypt via buildBallot's internal ct list. Instead: the
      // inputs carry bytes, and we decode them here ourselves.
      for (let j = 0; j < ℓ; j++) {
        const [c1Bytes, c2Bytes] = inputs.ciphertexts[j]!;
        ctByCand[j]!.push({
          c1: pointFromBytes(c1Bytes),
          c2: pointFromBytes(c2Bytes),
        });
      }
    }

    // Phase 4b: homomorphic aggregation per candidate.
    const ctSum: Ciphertext[] = ctByCand.map((cts) => sumCts(cts));

    // Phase 5: any t+1 keypers (pick indices 1, 3, 5 = 1-based α = 1,3,5)
    // partial-decrypt, every share is verified, Lagrange-combine, BSGS.
    const subset = [0, 2, 4]; // indices into dkg arrays
    const alphas = subset.map((k) => dkg.alphas[k]!);
    const table = buildBabyStepTable(BigInt(p * B));

    for (let j = 0; j < ℓ; j++) {
      const shares = subset.map((k) => {
        const s = partialDecrypt(
          ctSum[j]!,
          dkg.msk_k[k]!,
          dkg.mpk_k[k]!,
          k + 1,
          new Transcript(`tally:${j}:${k + 1}`),
        );
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
});

function pointFromBytes(b: Uint8Array) {
  return G2Point.fromBytes(b);
}
