/**
 * Cross-implementation test vectors. Loads every JSON file under
 * `tests/vectors/<category>/` and re-runs the SDK's verify path.
 * An independent re-verifier in another language consumes the same
 * files; if this test and theirs both green, the wire-level contract
 * matches. See `tests/vectors/_schema.ts` for the JSON shape and
 * `scripts/gen-vectors.ts` for the generator.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  Ciphertext,
  Transcript,
  buildBabyStepTable,
  combineShares,
  encrypt,
  initCurves,
  recoverDiscreteLogWithTable,
  schnorrVerify,
  verifyBallot,
  verifyDecryptionShare,
} from '../src';
import { decodeSchnorr } from '../src/contract/codec';
import {
  verifyBudget,
  verifyDLEQ,
  verifyOR,
} from '../src/voting/proofs';
import {
  BallotVector,
  BudgetVector,
  DecryptShareVector,
  DLEQVector,
  EncryptVector,
  ORVector,
  SchnorrVector,
  TallyVector,
  decToScalar,
  decodeDLEQ,
  decodeORProof,
  g1FromHex,
  g2FromHex,
  hexToBytes,
} from './vectors/_schema';

beforeAll(async () => {
  await initCurves();
});

const VECTORS_DIR = join(__dirname, 'vectors');

function loadCategory<T>(category: string): Array<{ name: string; vec: T }> {
  const dir = join(VECTORS_DIR, category);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({
      name: f.replace(/\.json$/, ''),
      vec: JSON.parse(readFileSync(join(dir, f), 'utf8')) as T,
    }));
}

describe('cross-impl vectors', () => {
  describe('encrypt/', () => {
    for (const { name, vec } of loadCategory<EncryptVector>('encrypt')) {
      it(name, () => {
        const mpk = g2FromHex(vec.inputs.mpk);
        const m = decToScalar(vec.inputs.m);
        const r = decToScalar(vec.inputs.r);
        const { ct } = encrypt(m, mpk, r);
        expect(ct.c1.toBytes()).toEqual(g2FromHex(vec.expected.c1).toBytes());
        expect(ct.c2.toBytes()).toEqual(g2FromHex(vec.expected.c2).toBytes());
      });
    }
  });

  describe('dleq/', () => {
    for (const { name, vec } of loadCategory<DLEQVector>('dleq')) {
      it(name, () => {
        const stmt = {
          base1: g2FromHex(vec.inputs.base1),
          base2: g2FromHex(vec.inputs.base2),
          point1: g2FromHex(vec.inputs.point1),
          point2: g2FromHex(vec.inputs.point2),
        };
        const proof = decodeDLEQ(hexToBytes(vec.inputs.proof));
        const ok = verifyDLEQ(stmt, proof, new Transcript(vec.inputs.transcript_label));
        expect(ok).toBe(vec.expected.verify);
      });
    }
  });

  describe('or/', () => {
    for (const { name, vec } of loadCategory<ORVector>('or')) {
      it(name, () => {
        const mpk = g2FromHex(vec.inputs.mpk);
        const ct: Ciphertext = {
          c1: g2FromHex(vec.inputs.ct.c1),
          c2: g2FromHex(vec.inputs.ct.c2),
        };
        const candidates = vec.inputs.candidates.map(decToScalar);
        const proof = decodeORProof(hexToBytes(vec.inputs.or_proof_encoded));
        const ok = verifyOR(
          { ct, mpk, candidates },
          proof,
          new Transcript(vec.inputs.transcript_label),
        );
        expect(ok).toBe(vec.expected.verify);
      });
    }
  });

  describe('budget/', () => {
    for (const { name, vec } of loadCategory<BudgetVector>('budget')) {
      it(name, () => {
        const mpk = g2FromHex(vec.inputs.mpk);
        const ctSum: Ciphertext = {
          c1: g2FromHex(vec.inputs.ct_sum.c1),
          c2: g2FromHex(vec.inputs.ct_sum.c2),
        };
        const proof =
          vec.inputs.mode === 'exact'
            ? { mode: 'exact' as const, proof: decodeDLEQ(hexToBytes(vec.inputs.proof_encoded)) }
            : { mode: 'atMost' as const, proof: decodeORProof(hexToBytes(vec.inputs.proof_encoded)) };
        const ok = verifyBudget(
          { mpk, ctSum, budget: BigInt(vec.inputs.budget) },
          proof,
          new Transcript(vec.inputs.transcript_label),
        );
        expect(ok).toBe(vec.expected.verify);
      });
    }
  });

  describe('schnorr/', () => {
    for (const { name, vec } of loadCategory<SchnorrVector>('schnorr')) {
      it(name, () => {
        const vk = g1FromHex(vec.inputs.vk);
        const msg = hexToBytes(vec.inputs.message);
        const sig = decodeSchnorr(hexToBytes(vec.inputs.sig));
        expect(schnorrVerify(vk, msg, sig)).toBe(vec.expected.verify);
      });
    }
  });

  describe('decrypt-share/', () => {
    for (const { name, vec } of loadCategory<DecryptShareVector>('decrypt-share')) {
      it(name, () => {
        const ctSum: Ciphertext = {
          c1: g2FromHex(vec.inputs.ct_sum.c1),
          c2: g2FromHex(vec.inputs.ct_sum.c2),
        };
        const committeePK = g2FromHex(vec.inputs.committee_pk);
        const share = {
          keyperIndex: vec.inputs.share.keyper_index,
          sigma: g2FromHex(vec.inputs.share.sigma),
          proof: decodeDLEQ(hexToBytes(vec.inputs.share.dleq_proof)),
        };
        const ok = verifyDecryptionShare(
          ctSum,
          share,
          committeePK,
          new Transcript(vec.inputs.transcript_label),
        );
        expect(ok).toBe(vec.expected.verify);
      });
    }
  });

  describe('ballot/', () => {
    const accept = () => true;
    for (const { name, vec } of loadCategory<BallotVector>('ballot')) {
      it(name, () => {
        const mpk = g2FromHex(vec.inputs.mpk);
        const inputs = {
          electionId: hexToBytes(vec.inputs.election_id),
          pseudonym: hexToBytes(vec.inputs.pseudonym),
          vk: hexToBytes(vec.inputs.vk),
          ciphertexts: vec.inputs.ciphertexts.map(
            ({ c1, c2 }) => [hexToBytes(c1), hexToBytes(c2)] as [Uint8Array, Uint8Array],
          ),
          zkProof: hexToBytes(vec.inputs.zkProof),
          voterSignature: hexToBytes(vec.inputs.signature),
          wrAttestation: hexToBytes(vec.inputs.wr_attestation),
        };
        const r = verifyBallot(inputs, vec.inputs.params, mpk, accept);
        expect(r.ok).toBe(vec.expected.verify);
      });
    }
  });

  describe('tally/', () => {
    for (const { name, vec } of loadCategory<TallyVector>('tally')) {
      it(name, () => {
        const ctSum: Ciphertext = {
          c1: g2FromHex(vec.inputs.ct_sum.c1),
          c2: g2FromHex(vec.inputs.ct_sum.c2),
        };
        const committeePKs = vec.inputs.committee_pks.map(g2FromHex);
        const alphas = vec.inputs.alphas.map(decToScalar);
        const upperBound = decToScalar(vec.inputs.upper_bound);
        const shares = vec.inputs.shares.map((s) => ({
          keyperIndex: s.keyper_index,
          sigma: g2FromHex(s.sigma),
          proof: decodeDLEQ(hexToBytes(s.dleq_proof)),
        }));
        // Re-verify each share's DLEQ against the committee pk at its index.
        for (const s of shares) {
          const pk = committeePKs[s.keyperIndex - 1]!;
          const ok = verifyDecryptionShare(
            ctSum,
            s,
            pk,
            new Transcript(`vec:tally:share:${s.keyperIndex}`),
          );
          expect(ok).toBe(true);
        }
        const tau = combineShares(shares, alphas, ctSum);
        const table = buildBabyStepTable(upperBound);
        const V = recoverDiscreteLogWithTable(tau, table);
        expect(V.toString()).toBe(vec.expected.V);
      });
    }
  });
});
