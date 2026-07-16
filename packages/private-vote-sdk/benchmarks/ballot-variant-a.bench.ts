/**
 * Variant A (direct range proofs over {0..B}) end-to-end ballot
 * prove+verify across a small (ℓ, B) grid. Lives in its own file so the
 * fixed-size blst WASM heap resets between Variant A and Variant B
 * workers — attempts to cover both in one file OOM the WASM module.
 */

import {
  BallotVerifyParams,
  G2Point,
  encodeBallotValidityProof,
  initCurves,
  verifyBallot,
} from '../src';
import { randomScalar } from '../src/crypto/field';
import { bench, printTable } from './lib/timer';
import { buildBallot, distribute } from './lib/ballot';

beforeAll(async () => {
  await initCurves();
});

const accept = () => true;

describe('ballot — Variant A across (ℓ, B)', () => {
  const GRID: { l: number; B: number }[] = [
    { l: 3, B: 3 },
    { l: 5, B: 5 },
    { l: 10, B: 5 },
  ];

  it('prove + verify', async () => {
    const mpk = G2Point.generator().mul(randomScalar());
    const sizeRows: Array<Record<string, string | number>> = [];
    for (const { l, B } of GRID) {
      const params: BallotVerifyParams = {
        numCandidates: l,
        budget: B,
        mode: 'exact',
        variant: 'A',
      };
      const votes = distribute(B, l);
      const { inputs, bvp } = buildBallot({
        mpk,
        electionId: new Uint8Array(32),
        pseudonym: new Uint8Array(32),
        votes,
        params,
      });
      sizeRows.push({
        config: `ℓ=${l}, B=${B}`,
        'zkProof bytes': encodeBallotValidityProof(bvp).length,
        ciphertexts: inputs.ciphertexts.length,
      });

      await bench(`A prove  ℓ=${l}, B=${B}`, { iterations: 5 }, () => {
        buildBallot({
          mpk,
          electionId: new Uint8Array(32),
          pseudonym: new Uint8Array(32),
          votes,
          params,
        });
      });
      await bench(`A verify ℓ=${l}, B=${B}`, { iterations: 10 }, () => {
        verifyBallot(inputs, params, mpk, accept);
      });
    }
    printTable('Variant A — proof sizes', sizeRows);
  });
});
