/**
 * GATE 0 — protocol parity.
 *
 * Snapshot's private voting and the `generalised-el-gamal` (`geg`) stack have to
 * agree on one wire format byte-for-byte: geg's keypers aggregate and decrypt
 * the very ballots this repo's browser builds, and its coordinator publishes the
 * totals Snapshot then shows as scores. Nothing detects a disagreement at
 * runtime — a drifted proof format shows up as ballots that silently fail to
 * admit, and a tally of zeros.
 *
 * This test is what makes that impossible to miss. It replays geg's **own
 * canonical vector corpus** (`vectors/`, a checked-in copy — see
 * `vectors/PROVENANCE.md`) through the pinned published crypto build and asserts
 * every expectation holds. If it fails, the pinned version and geg disagree
 * about the protocol, and no integration work should proceed on top.
 *
 * Parity is therefore a **version pin**, not a code merge: Snapshot depends on a
 * published `@shutter-network/urban-verified-crypto` build, and this suite is
 * the proof that the pinned one agrees with geg. Bumping the dependency without
 * this going green is the failure mode it exists to catch.
 *
 * Two things go beyond the shared category runner:
 *
 *   - `ballot/*_known` — a *construction* vector with pinned randomness, so the
 *     canonical Schnorr preimage can be compared byte-for-byte.
 *   - `flow/` — a complete election: 5 ballots (one duplicate, one with a bad
 *     signature) → weighted aggregate over the admitted set → t+1 shares →
 *     Lagrange + BSGS → published totals. This exercises the exact pipeline the
 *     integration splits across the hub, the keypers, and the coordinator.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  addCt,
  canonicalBallotMessage,
  type Ciphertext,
  decodeDLEQ,
  G2Point,
  initCurves,
  recoverTally,
  verifyTallyAgainstTotals,
  scalarMulCt,
  Transcript,
  verifyBallot
} from '@shutter-network/urban-verified-crypto';
import { bytesToHex, hexToBytes as hex } from './lib/codec';
import {
  COVERED_BY_ANOTHER_SUITE,
  listAllVectorFiles,
  loadCategory,
  registerVectorSuite,
  TRANSITIVELY_COVERED_CATEGORIES
} from './lib/vectorSuite';

const VECTORS_DIR = join(__dirname, '..', 'vectors');

beforeAll(async () => {
  await initCurves();
});

function u16BE(n: number): Uint8Array {
  return new Uint8Array([(n >>> 8) & 0xff, n & 0xff]);
}

function readVector<T>(relPath: string): T {
  return JSON.parse(readFileSync(join(VECTORS_DIR, relPath), 'utf8')) as T;
}

// ---------------------------------------------------------------------------

type FlowVector = {
  config: {
    electionId: string;
    numCandidates: number;
    budget: number;
    mode: 'exact' | 'atMost';
    variant: 'A' | 'B';
    maxWeight: number;
    threshold: { t: number; n: number };
    eligibilityKey: string;
  };
  finalizedKey: { pkElection: string; committeePKs: string[] };
  ballots: Array<{
    electionId: string;
    pseudonym: string;
    vk: string;
    ciphertexts: Array<{ c1: string; c2: string }>;
    zkProof: string;
    voterSignature: string;
    attestation: {
      scheme: 'ATTESTATION_V1' | 'ATTESTATION_LEGACY';
      electionId: string;
      pseudonym: string;
      vk: string;
      weight: number;
      nonce: number;
      signature: string;
    };
  }>;
  aggregate: {
    aggregates: Array<{ c1: string; c2: string }>;
    admitted: number[];
    exclusions: Array<{ sequenceNumber: number; reason: string }>;
    totalAdmittedWeight: number;
  };
  shares: Array<{
    keyperIndex: number;
    entries: Array<{ sigma: string; proof: string }>;
  }>;
  result: { totals: number[]; keyperIndices: number[]; bsgsBound: number };
};

/** Exclusion reasons that mean the ballot's own crypto is invalid. */
const CRYPTO_FAILURE_REASONS = new Set([
  'INVALID_PROOF',
  'INVALID_SIGNATURE',
  'MALFORMED'
]);

// ---------------------------------------------------------------------------

describe('gate 0 — geg canonical vectors verify under the pinned build', () => {
  const handled = registerVectorSuite(VECTORS_DIR);

  describe('ballot/ construction vector (pinned randomness)', () => {
    const FILE = 'ballot/ballot_variantA_exact_known.json';
    handled.add(FILE);
    type KnownBallot = {
      inputs: {
        electionId: string;
        pseudonym: string;
        vk: string;
        mpk: string;
        params: {
          numCandidates: number;
          budget: number;
          mode: 'exact' | 'atMost';
          variant: 'A' | 'B';
        };
      };
      outputs: {
        ciphertexts: string[][];
        zkProof: string;
        voterSignature: string;
        canonical_preimage: string;
      };
      expected: { verifyBallot: boolean; reason: string | null };
    };
    const vec = readVector<KnownBallot>(FILE);
    const cts = vec.outputs.ciphertexts.map(
      ([c1, c2]) => [hex(c1, 'c1'), hex(c2, 'c2')] as [Uint8Array, Uint8Array]
    );
    /** The credential pinned in the vector, which the preimage now covers. */
    const pinnedAttestation = () => {
      const a = (vec.inputs as any).attestation;
      return {
        electionId: hex(a.electionId, 'attestation.electionId'),
        pseudonym: hex(a.pseudonym, 'attestation.pseudonym'),
        vk: hex(a.vk, 'attestation.vk'),
        weight: BigInt(a.weight),
        nonce: BigInt(a.nonce),
        signature: hex(a.signature, 'attestation.signature')
      };
    };

    // The canonical Schnorr preimage is the single most drift-prone byte string
    // in the protocol: every ballot signature depends on its exact layout, and a
    // mismatch would invalidate every ballot rather than fail loudly.
    it('reproduces the canonical ballot preimage byte-for-byte', () => {
      const preimage = canonicalBallotMessage({
        electionId: hex(vec.inputs.electionId, 'electionId'),
        pseudonym: hex(vec.inputs.pseudonym, 'pseudonym'),
        ciphertexts: cts,
        zkProof: hex(vec.outputs.zkProof, 'zkProof'),
        attestation: pinnedAttestation()
      });
      expect(bytesToHex(preimage)).toBe(
        bytesToHex(hex(vec.outputs.canonical_preimage, 'canonical_preimage'))
      );
    });

    it('verifies the pinned ballot', () => {
      const mpk = G2Point.fromBytes(hex(vec.inputs.mpk, 'mpk'));
      try {
        const r = verifyBallot(
          {
            electionId: hex(vec.inputs.electionId, 'electionId'),
            pseudonym: hex(vec.inputs.pseudonym, 'pseudonym'),
            vk: hex(vec.inputs.vk, 'vk'),
            ciphertexts: cts,
            zkProof: hex(vec.outputs.zkProof, 'zkProof'),
            voterSignature: hex(vec.outputs.voterSignature, 'voterSignature'),
            attestation: pinnedAttestation()
          },
          vec.inputs.params,
          mpk,
          hex((vec.inputs as any).eligibilityKey, 'eligibilityKey')
        );
        expect(r.ok).toBe(vec.expected.verifyBallot);
      } finally {
        mpk.destroyWasm();
      }
    });
  });

  describe('flow/ full election (level 1)', () => {
    const FILE = 'flow/full_election_level1.json';
    handled.add(FILE);
    const vec = readVector<FlowVector>(FILE);
    const { config, finalizedKey, ballots, aggregate, result } = vec;
    const electionId = hex(config.electionId, 'config.electionId');

    const reasonBySeq = new Map(
      aggregate.exclusions.map(x => [x.sequenceNumber, x.reason])
    );

    it('every ballot verifies exactly as its exclusion reason implies', () => {
      const mpk = G2Point.fromBytes(hex(finalizedKey.pkElection, 'pkElection'));
      try {
        ballots.forEach((b, seq) => {
          const reason = reasonBySeq.get(seq);
          const expectValid = !(reason && CRYPTO_FAILURE_REASONS.has(reason));
          const r = verifyBallot(
            {
              electionId: hex(b.electionId, 'electionId'),
              pseudonym: hex(b.pseudonym, 'pseudonym'),
              vk: hex(b.vk, 'vk'),
              ciphertexts: b.ciphertexts.map(
                c =>
                  [hex(c.c1, 'c1'), hex(c.c2, 'c2')] as [Uint8Array, Uint8Array]
              ),
              zkProof: hex(b.zkProof, 'zkProof'),
              voterSignature: hex(b.voterSignature, 'voterSignature'),
              attestation: {
                electionId: hex(
                  b.attestation.electionId,
                  'attestation.electionId'
                ),
                pseudonym: hex(b.attestation.pseudonym, 'attestation.pseudonym'),
                vk: hex(b.attestation.vk, 'attestation.vk'),
                weight: BigInt(b.attestation.weight),
                nonce: BigInt(b.attestation.nonce),
                signature: hex(b.attestation.signature, 'attestation.signature')
              }
            },
            config,
            mpk,
            hex(config.eligibilityKey, 'config.eligibilityKey')
          );
          expect({ seq, ok: r.ok }).toEqual({ seq, ok: expectValid });
        });
      } finally {
        mpk.destroyWasm();
      }
    });

    // The property Phase 1's exit gate needs: an independent implementation,
    // given the same admitted set and the same attested weights, reproduces the
    // published aggregate exactly. Byte equality is the requirement — the
    // integration makes an aggregate canonical only at a t+1 *byte-identical*
    // keyper quorum, so "mathematically equal" is not good enough.
    it('recomputes the weighted aggregate byte-for-byte', () => {
      const acc: Array<Ciphertext | null> = new Array(
        config.numCandidates
      ).fill(null);
      // Accumulating over ballots on a fixed WASM heap: free each superseded
      // point immediately, or intermediates pile up until GC happens to run.
      try {
        for (const seq of aggregate.admitted) {
          const b = ballots[seq]!;
          const w = BigInt(b.attestation.weight);
          for (let j = 0; j < config.numCandidates; j++) {
            const raw: Ciphertext = {
              c1: G2Point.fromBytes(hex(b.ciphertexts[j]!.c1, 'c1')),
              c2: G2Point.fromBytes(hex(b.ciphertexts[j]!.c2, 'c2'))
            };
            const weighted = w === 1n ? raw : scalarMulCt(w, raw);
            if (w !== 1n) {
              raw.c1.destroyWasm();
              raw.c2.destroyWasm();
            }
            const prev = acc[j];
            if (prev === null || prev === undefined) {
              acc[j] = weighted;
            } else {
              acc[j] = addCt(prev, weighted);
              prev.c1.destroyWasm();
              prev.c2.destroyWasm();
              weighted.c1.destroyWasm();
              weighted.c2.destroyWasm();
            }
          }
        }

        const got = acc.map(ct => ({
          c1: bytesToHex(ct!.c1.toBytes()),
          c2: bytesToHex(ct!.c2.toBytes())
        }));
        const want = aggregate.aggregates.map(ct => ({
          c1: bytesToHex(hex(ct.c1, 'c1')),
          c2: bytesToHex(hex(ct.c2, 'c2'))
        }));
        expect(got).toEqual(want);
      } finally {
        for (const ct of acc) {
          ct?.c1.destroyWasm();
          ct?.c2.destroyWasm();
        }
      }
    });

    it('derives the BSGS bound as budget × total admitted weight', () => {
      expect(result.bsgsBound).toBe(
        config.budget * aggregate.totalAdmittedWeight
      );
    });

    it('recovers the published totals from a quorum of shares', () => {
      const ctSums: Ciphertext[] = aggregate.aggregates.map(ct => ({
        c1: G2Point.fromBytes(hex(ct.c1, 'agg.c1')),
        c2: G2Point.fromBytes(hex(ct.c2, 'agg.c2'))
      }));
      const committeePKs = finalizedKey.committeePKs.map(p =>
        G2Point.fromBytes(hex(p, 'committeePK'))
      );
      // The share envelope is per-keyper with one entry per candidate;
      // recoverTally wants the transpose, indexed [candidate][share].
      const sharesPerCandidate = aggregate.aggregates.map((_, j) =>
        vec.shares.map(s => ({
          keyperIndex: s.keyperIndex,
          sigma: G2Point.fromBytes(hex(s.entries[j]!.sigma, 'sigma')),
          proof: decodeDLEQ(hex(s.entries[j]!.proof, 'proof'))
        }))
      );
      try {
        const totals = recoverTally({
          ctSums,
          sharesPerCandidate,
          // SDK boundary: the config's `t` is the quorum, while this argument is
          // the fault count and the wrapper combines one more share than it.
          threshold: config.threshold.t - 1,
          committeePKs,
          upperBound: BigInt(result.bsgsBound),
          transcriptFor: (j: number) => {
            const t = new Transcript('SHUTTER-VOTE-DECRYPT-v1');
            t.append('electionId', electionId);
            t.append('candidate', u16BE(j));
            return t;
          }
        });
        expect(totals.map(String)).toEqual(result.totals.map(String));
      } finally {
        for (const ct of ctSums) {
          ct.c1.destroyWasm();
          ct.c2.destroyWasm();
        }
        for (const pk of committeePKs) pk.destroyWasm();
        for (const perCandidate of sharesPerCandidate) {
          for (const s of perCandidate) s.sigma.destroyWasm();
        }
      }
    });

    // The same vector through the *checking* path rather than the solving one.
    //
    // This is the cross-implementation half of the guarantee: geg's
    // `check_result` and the SDK's `verifyTallyAgainstTotals` must agree on what
    // "this tally verifies" means, against bytes geg produced. Without it each
    // implementation is only ever tested against itself, and a divergence would
    // surface as a committee and a browser disagreeing about a real election.
    // geg drives this same vector in `tests/test_conformance_vectors.py`.
    describe('verifyTallyAgainstTotals', () => {
      const withVector = <T>(fn: (args: any) => T): T => {
        const ctSums: Ciphertext[] = aggregate.aggregates.map(ct => ({
          c1: G2Point.fromBytes(hex(ct.c1, 'agg.c1')),
          c2: G2Point.fromBytes(hex(ct.c2, 'agg.c2'))
        }));
        const committeePKs = finalizedKey.committeePKs.map(p =>
          G2Point.fromBytes(hex(p, 'committeePK'))
        );
        const sharesPerCandidate = aggregate.aggregates.map((_, j) =>
          vec.shares.map(s => ({
            keyperIndex: s.keyperIndex,
            sigma: G2Point.fromBytes(hex(s.entries[j]!.sigma, 'sigma')),
            proof: decodeDLEQ(hex(s.entries[j]!.proof, 'proof'))
          }))
        );
        try {
          return fn({
            ctSums,
            sharesPerCandidate,
            threshold: config.threshold.t - 1,
            committeePKs,
            upperBound: BigInt(result.bsgsBound),
            transcriptFor: (j: number) => {
              const t = new Transcript('SHUTTER-VOTE-DECRYPT-v1');
              t.append('electionId', electionId);
              t.append('candidate', u16BE(j));
              return t;
            }
          });
        } finally {
          for (const ct of ctSums) {
            ct.c1.destroyWasm();
            ct.c2.destroyWasm();
          }
          for (const pk of committeePKs) pk.destroyWasm();
          for (const perCandidate of sharesPerCandidate) {
            for (const s of perCandidate) s.sigma.destroyWasm();
          }
        }
      };

      const totals = () => result.totals.map((t: any) => BigInt(t));

      it("accepts the vector's published totals", () => {
        const out = withVector(args =>
          verifyTallyAgainstTotals({ ...args, claimedTotals: totals() })
        );
        expect(out).toEqual({ ok: true, reason: null });
      });

      it('rejects a single perturbed total', () => {
        // Moving one vote between candidates keeps the sum intact, so only the
        // per-candidate group equality separates this from the truth.
        const t = totals();
        t[0] = t[0]! + 1n;
        t[1] = t[1]! - 1n;
        const out = withVector(args =>
          verifyTallyAgainstTotals({ ...args, claimedTotals: t })
        );
        expect(out.ok).toBe(false);
        expect(out.reason).toContain('does not decrypt the aggregate');
      });

      it('rejects totals that no longer sum to the declared bound', () => {
        const t = totals();
        t[0] = t[0]! + 1n;
        const out = withVector(args =>
          verifyTallyAgainstTotals({ ...args, claimedTotals: t })
        );
        expect(out.ok).toBe(false);
        expect(out.reason).toMatch(/^result:/);
      });

      it('rejects a total pushed outside the bound', () => {
        const t = totals();
        t[0] = BigInt(result.bsgsBound) + 1n;
        const out = withVector(args =>
          verifyTallyAgainstTotals({ ...args, claimedTotals: t })
        );
        expect(out.ok).toBe(false);
        expect(out.reason).toContain('outside');
      });

      it('rejects a share set short of the quorum', () => {
        const out = withVector(args =>
          verifyTallyAgainstTotals({
            ...args,
            sharesPerCandidate: args.sharesPerCandidate.map((p: any[]) =>
              p.slice(0, config.threshold.t - 1)
            ),
            claimedTotals: totals()
          })
        );
        expect(out.ok).toBe(false);
        expect(out.reason).toMatch(/^shares:/);
      });
    });
  });

  // Not decoration: without this, a vector geg adds later would sit on disk
  // unchecked and the gate would still report green. Categories with no verifier
  // on the published API are accounted for by name rather than ignored — see the
  // header of tests/lib/vectorSuite.ts for how each one is covered.
  it('accounts for every vector file in the corpus', () => {
    const all = listAllVectorFiles(VECTORS_DIR);
    expect(all.length).toBeGreaterThan(0);

    const accountedFor = {
      ...TRANSITIVELY_COVERED_CATEGORIES,
      ...COVERED_BY_ANOTHER_SUITE
    };
    const elsewhere = all.filter(
      f => accountedFor[f.split('/')[0]!] !== undefined
    );
    expect([...handled, ...elsewhere].sort()).toEqual(all);

    // Every category not driven here must say where it *is* driven, so the list
    // cannot quietly grow into a dumping ground for unchecked vectors.
    for (const f of elsewhere) {
      expect(accountedFor[f.split('/')[0]!]).toBeTruthy();
    }
  });
});
