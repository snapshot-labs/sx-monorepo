/**
 * Variant B (binary decomposition — ℓ·d OR proofs over {0,1}) end-to-end
 * ballot prove+verify. Split from Variant A because the two together
 * accumulate enough G₂ points to OOM the blst WASM heap, which is fixed
 * at 16MB without growth support.
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
import { buildBallot, ceilLog2, distribute } from './lib/ballot';

beforeAll(async () => {
  await initCurves();
});

const accept = () => true;

describe('ballot — Variant B across (ℓ, B)', () => {
  const GRID: { l: number; B: number }[] = [
    { l: 3, B: 3 },
    { l: 5, B: 5 },
    { l: 10, B: 5 },
  ];

  it('prove + verify', async () => {
    const mpk = G2Point.generator().mul(randomScalar());
    const sizeRows: Array<Record<string, string | number>> = [];
    for (const { l, B } of GRID) {
      const d = ceilLog2(B + 1);
      const params: BallotVerifyParams = {
        numCandidates: l,
        budget: B,
        mode: 'exact',
        variant: 'B',
        d,
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
        config: `ℓ=${l}, B=${B}, d=${d}`,
        'zkProof bytes': encodeBallotValidityProof(bvp).length,
        ciphertexts: inputs.ciphertexts.length,
      });

      await bench(
        `B prove  ℓ=${l}, B=${B}, d=${d}`,
        { iterations: 5 },
        () => {
          buildBallot({
            mpk,
            electionId: new Uint8Array(32),
            pseudonym: new Uint8Array(32),
            votes,
            params,
          });
        },
      );
      await bench(
        `B verify ℓ=${l}, B=${B}, d=${d}`,
        { iterations: 10 },
        () => {
          verifyBallot(inputs, params, mpk, accept);
        },
      );
    }
    printTable('Variant B — proof sizes', sizeRows);
  });
});
