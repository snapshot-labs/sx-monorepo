/**
 * The vector runner: replays the protocol's canonical corpus through the
 * published crypto build.
 *
 * `registerVectorSuite` records every file it handled into the returned set, so
 * the caller can assert afterwards that nothing on disk went unchecked — which
 * is what makes this a gate rather than a smoke test.
 *
 * **Why some categories are not driven directly.** The published package
 * exports the *provers* (`proveOR`, `proveBudgetExact`, `proveBudgetAtMost`) but
 * not their verifiers, and no standalone DLEQ verifier. So `or/`, `budget/` and
 * `dleq/` cannot be fed to a verifier through the public API. They are still
 * covered — every one of those proof systems runs inside code paths this suite
 * does exercise:
 *
 *   - `or/` and `budget/` run inside `verifyBallot`, which the `ballot/` vectors
 *     and the five ballots of `flow/` drive, including deliberately invalid ones.
 *   - `dleq/` runs inside `verifyDecryptionShare`, which the `decrypt-share/`
 *     and `tally/` vectors drive, including the cross-implementation DKG shares.
 *
 * A break in any of those primitives fails this suite; it surfaces as a failing
 * ballot or share rather than as a failing primitive, which costs granularity in
 * the error message and nothing in coverage. Reimplementing the three verifiers
 * here to recover that granularity would mean testing this file instead of the
 * shipped crypto, which is the one thing a parity gate must not do.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildBabyStepTable,
  type Ciphertext,
  combineShares,
  decodeDLEQ,
  encrypt,
  recoverDiscreteLogWithTable,
  schnorrVerify,
  Transcript,
  verifyBallot,
  verifyDecryptionShare
} from '@shutter-network/urban-verified-crypto';
import {
  decodeSchnorrSig,
  decToScalar,
  g1FromHex,
  g2FromHex,
  hexToBytes
} from './codec';

/**
 * Categories with no verifier on the public API, covered through the composite
 * paths named in the file header. Listed explicitly so the coverage assertion
 * stays honest: a file here is accounted for, not ignored.
 */
export const TRANSITIVELY_COVERED_CATEGORIES: Record<string, string> = {
  or: 'verifyBallot (ballot/, flow/) runs the OR proof',
  budget: 'verifyBallot (ballot/, flow/) runs the budget proof',
  dleq: 'verifyDecryptionShare (decrypt-share/, tally/) runs the DLEQ'
};

/**
 * Categories checked by a different suite, against these same files.
 *
 * The published package has no attestation module, so verifying these vectors
 * means having an implementation of the credential transcript. Exactly one such
 * implementation exists in this repo — the hub's, which is the one that actually
 * mints credentials in production — and `apps/hub/test/unit/geg-attestation.test.ts`
 * drives these vectors through it. A second transcription here would only pin
 * itself: it is the *shipped* construction that has to match the corpus.
 *
 * When a published version of the crypto package includes the attestation module
 * (it is implemented upstream, unreleased), the hub's copy goes away and this
 * category can move back here, driven through the package's own verifier.
 */
export const COVERED_BY_ANOTHER_SUITE: Record<string, string> = {
  attestation:
    "apps/hub/test/unit/geg-attestation.test.ts — these vectors verify against hub's own credential construction",
  // Weight scaling is applied in the UI, not in the published SDK, so the vector is
  // driven from there. geg replays the same file in test_conformance_vectors.py.
  scale:
    'apps/ui/src/helpers/teScale.parity.test.ts — drives the same file through the UI scaling helper'
};

export function loadCategory<T>(
  vectorsDir: string,
  category: string
): Array<{ name: string; file: string; vec: T }> {
  const dir = join(vectorsDir, category);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => ({
      name: f.replace(/\.json$/, ''),
      file: `${category}/${f}`,
      vec: JSON.parse(readFileSync(join(dir, f), 'utf8')) as T
    }));
}

/** Every `<category>/<file>.json` under `vectorsDir`, relative-path form. */
export function listAllVectorFiles(vectorsDir: string): string[] {
  return readdirSync(vectorsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .flatMap(d =>
      readdirSync(join(vectorsDir, d.name))
        .filter(f => f.endsWith('.json'))
        .map(f => `${d.name}/${f}`)
    )
    .sort();
}

/**
 * A ballot vector comes in two shapes. The verify shape ships the finished
 * artifact (`inputs.zkProof`) for a verifier to check. The construction shape
 * ships pinned randomness plus an `outputs` block, so a second implementation
 * can rebuild the ballot and compare bytes. This runner only handles the first;
 * the caller claims the second.
 */
function isVerifyShapeBallot(vec: any): boolean {
  return typeof vec?.inputs?.zkProof === 'string';
}

export function registerVectorSuite(vectorsDir: string): Set<string> {
  const handled = new Set<string>();

  describe('encrypt/', () => {
    for (const { name, file, vec } of loadCategory<any>(
      vectorsDir,
      'encrypt'
    )) {
      handled.add(file);
      it(name, () => {
        const mpk = g2FromHex(vec.inputs.mpk);
        const { ct } = encrypt(
          decToScalar(vec.inputs.m),
          mpk,
          decToScalar(vec.inputs.r)
        );
        expect(ct.c1.toBytes()).toEqual(g2FromHex(vec.expected.c1).toBytes());
        expect(ct.c2.toBytes()).toEqual(g2FromHex(vec.expected.c2).toBytes());
      });
    }
  });

  describe('schnorr/', () => {
    for (const { name, file, vec } of loadCategory<any>(
      vectorsDir,
      'schnorr'
    )) {
      handled.add(file);
      it(name, () => {
        const vk = g1FromHex(vec.inputs.vk);
        const msg = hexToBytes(vec.inputs.message, 'message');
        const sig = decodeSchnorrSig(
          hexToBytes(vec.inputs.sig ?? vec.inputs.sig_encoded, 'sig')
        );
        expect(schnorrVerify(vk, msg, sig)).toBe(vec.expected.verify);
      });
    }
  });

  describe('decrypt-share/', () => {
    for (const { name, file, vec } of loadCategory<any>(
      vectorsDir,
      'decrypt-share'
    )) {
      handled.add(file);
      it(name, () => {
        const ctSum: Ciphertext = {
          c1: g2FromHex(vec.inputs.ct_sum.c1),
          c2: g2FromHex(vec.inputs.ct_sum.c2)
        };
        const committeePK = g2FromHex(vec.inputs.committee_pk);
        const share = {
          keyperIndex: vec.inputs.share.keyper_index,
          sigma: g2FromHex(vec.inputs.share.sigma),
          proof: decodeDLEQ(hexToBytes(vec.inputs.share.dleq_proof, 'dleq'))
        };
        const ok = verifyDecryptionShare(
          ctSum,
          share,
          committeePK,
          new Transcript(vec.inputs.transcript_label)
        );
        expect(ok).toBe(vec.expected.verify);
      });
    }
  });

  describe('ballot/', () => {
    const accept = () => true;
    for (const { name, file, vec } of loadCategory<any>(vectorsDir, 'ballot')) {
      if (!isVerifyShapeBallot(vec)) continue; // claimed by the caller
      handled.add(file);
      it(name, () => {
        const mpk = g2FromHex(vec.inputs.mpk);
        const inputs = {
          electionId: hexToBytes(vec.inputs.election_id, 'election_id'),
          pseudonym: hexToBytes(vec.inputs.pseudonym, 'pseudonym'),
          vk: hexToBytes(vec.inputs.vk, 'vk'),
          ciphertexts: vec.inputs.ciphertexts.map(
            ({ c1, c2 }: { c1: string; c2: string }) =>
              [hexToBytes(c1, 'c1'), hexToBytes(c2, 'c2')] as [
                Uint8Array,
                Uint8Array
              ]
          ),
          zkProof: hexToBytes(vec.inputs.zkProof, 'zkProof'),
          voterSignature: hexToBytes(vec.inputs.signature, 'signature'),
          attestation: {
            electionId: hexToBytes(
              vec.inputs.attestation.electionId,
              'attestation.electionId'
            ),
            pseudonym: hexToBytes(
              vec.inputs.attestation.pseudonym,
              'attestation.pseudonym'
            ),
            vk: hexToBytes(vec.inputs.attestation.vk, 'attestation.vk'),
            weight: BigInt(vec.inputs.attestation.weight),
            nonce: BigInt(vec.inputs.attestation.nonce),
            signature: hexToBytes(
              vec.inputs.attestation.signature,
              'attestation.signature'
            )
          }
        };
        const r = verifyBallot(
          inputs,
          vec.inputs.params,
          mpk,
          hexToBytes(vec.inputs.eligibility_key, 'eligibility_key')
        );
        expect(r.ok).toBe(vec.expected.verify);
      });
    }
  });

  describe('tally/', () => {
    for (const { name, file, vec } of loadCategory<any>(vectorsDir, 'tally')) {
      handled.add(file);
      it(name, () => {
        const ctSum: Ciphertext = {
          c1: g2FromHex(vec.inputs.ct_sum.c1),
          c2: g2FromHex(vec.inputs.ct_sum.c2)
        };
        const committeePKs = vec.inputs.committee_pks.map(g2FromHex);
        const alphas = vec.inputs.alphas.map(decToScalar);
        const upperBound = decToScalar(vec.inputs.upper_bound);
        const shares = vec.inputs.shares.map((s: any) => ({
          keyperIndex: s.keyper_index,
          sigma: g2FromHex(s.sigma),
          proof: decodeDLEQ(hexToBytes(s.dleq_proof, 'dleq'))
        }));
        // Re-verify each share's DLEQ against the committee pk at its index.
        for (const s of shares) {
          const pk = committeePKs[s.keyperIndex - 1]!;
          const ok = verifyDecryptionShare(
            ctSum,
            s,
            pk,
            new Transcript(`vec:tally:share:${s.keyperIndex}`)
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

  return handled;
}
