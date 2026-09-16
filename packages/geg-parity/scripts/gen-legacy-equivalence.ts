/**
 * Capture what the pre-geg tally produced, so the replacement can be held to it.
 *
 * The legacy sequencer summed ballots itself in `apps/sequencer/src/helpers/te.ts`,
 * deleted when the committee took over aggregation. The plan's Phase 4 exit gate
 * asked for its outputs to be checked in **before** deletion, as a permanent guard
 * that the new path computes the same thing. That did not happen; this recovers it
 * from git history instead, which is possible because the file is still reachable
 * at `master:apps/sequencer/src/helpers/te.ts`.
 *
 *   bunx ts-node ./packages/geg-parity/scripts/gen-legacy-equivalence.ts
 *
 * **Equivalence is asserted only where behaviour was not deliberately changed.**
 * Legacy rounded voting power to an integer and dropped anything rounding to zero,
 * but it never clamped: `w = BigInt(Math.round(vote.vp))` with no ceiling. Current
 * behaviour clamps at `maxWeight` and refuses dust at ingest. So a fixture claiming
 * the two agree on a whale or on dust would be pinning behaviour we changed on
 * purpose, and would have to be deleted the first time it failed — the worst kind
 * of regression test.
 *
 * The corpus therefore has three parts, and only the first is an equivalence claim:
 *
 *   - `equivalent`  — weights inside the cap and above the floor, where legacy and
 *                     current must agree byte for byte. This is the real guard.
 *   - `divergent`   — a whale over the cap, recording *both* answers and why they
 *                     differ, so the change is documented rather than discovered.
 *   - `boundary`    — a total admitted weight above 2^53, where a JS number stops
 *                     being exact.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { keccak256 } from '@ethersproject/keccak256';
import {
  addCt,
  Ciphertext,
  G2Point,
  initCurves,
  scalarMulCt
} from '@shutter-network/urban-verified-crypto';

const OUT = join(__dirname, '../vectors/legacy-equivalence.json');

const PROPOSAL_ID = `0x${'7e'.repeat(32)}`;
const NUM_CANDIDATES = 3;
const MAX_WEIGHT = 10_000; // budget 100

/**
 * A stand-in ciphertext per ballot, derived from its index.
 *
 * Real ElGamal ciphertexts would need a DKG to produce and would make the corpus
 * unreadable. What is under test is the *weighted summation* — scalar-multiply by
 * the weight, then add — which is agnostic to how the points were produced, so
 * distinct valid curve points are sufficient and keep the fixture inspectable.
 */
function ballotCiphertexts(index: number): Ciphertext[] {
  const gen = G2Point.generator();
  const out: Ciphertext[] = [];
  for (let j = 0; j < NUM_CANDIDATES; j++) {
    const k = BigInt(keccak256(Buffer.from([index, j]))) % 1_000_000n;
    const scalar = k === 0n ? 1n : k;
    out.push({
      c1: gen.mul(scalar),
      c2: gen.mul(scalar + 1n)
    });
  }
  gen.destroyWasm();
  return out;
}

/** Legacy weighting, lifted verbatim from the deleted helper: round, no ceiling. */
function legacyWeight(vp: number): bigint {
  return BigInt(Math.round(vp));
}

/** Current weighting: the same rounding, then the protocol's per-voter ceiling. */
function currentWeight(vp: number): bigint {
  const rounded = BigInt(Math.round(vp));
  return rounded > BigInt(MAX_WEIGHT) ? BigInt(MAX_WEIGHT) : rounded;
}

type Hex = { c1: string; c2: string };

const hex = (ct: Ciphertext): Hex => ({
  c1: `0x${Buffer.from(ct.c1.toBytes()).toString('hex')}`,
  c2: `0x${Buffer.from(ct.c2.toBytes()).toString('hex')}`
});

/**
 * A ballot in the shape the verify panel consumes, so the corpus can be fed
 * straight to `aggregateBallots` without the test reconstructing anything.
 */
function ballot(index: number, vp: number) {
  return {
    voter: `0x${index.toString(16).padStart(40, '0')}`,
    vp,
    choice: {
      electionId: PROPOSAL_ID,
      pseudonym: `0x${index.toString(16).padStart(64, '0')}`,
      vk: `0x${'00'.repeat(48)}`,
      ciphertexts: ballotCiphertexts(index).map(hex),
      zkProof: '0x',
      voterSignature: `0x${'00'.repeat(80)}`
    }
  };
}

function sum(
  votes: { index: number; vp: number }[],
  weigh: (vp: number) => bigint
): Hex[] {
  const acc: (Ciphertext | null)[] = new Array(NUM_CANDIDATES).fill(null);
  for (const v of votes) {
    const w = weigh(v.vp);
    if (w <= 0n) continue; // legacy dropped dust here; current refuses it earlier
    const cts = ballotCiphertexts(v.index);
    for (let j = 0; j < NUM_CANDIDATES; j++) {
      const weighted = w === 1n ? cts[j] : scalarMulCt(w, cts[j]);
      acc[j] = acc[j] === null ? weighted : addCt(acc[j]!, weighted);
    }
  }
  return acc.map(ct => hex(ct!));
}

async function main() {
  await initCurves();

  const inCap = [
    { index: 0, vp: 1 },
    { index: 1, vp: 2 },
    { index: 2, vp: 1500 },
    { index: 3, vp: 1.4 }, // rounds down to 1 in both
    { index: 4, vp: 0.5 } // rounds up to 1 in both
  ];
  const overCap = [...inCap, { index: 5, vp: 995_500 }];

  const corpus = {
    _comment:
      'Legacy (pre-geg) tally outputs, recovered from master:apps/sequencer/src/helpers/te.ts. ' +
      'Regenerate with packages/geg-parity/scripts/gen-legacy-equivalence.ts; never hand-edit. ' +
      'Only `equivalent` is an equivalence claim — see the script header.',
    proposalId: PROPOSAL_ID,
    numCandidates: NUM_CANDIDATES,
    maxWeight: MAX_WEIGHT,
    equivalent: {
      note: 'Every weight inside [1, maxWeight]; legacy and current must agree.',
      ballots: inCap.map(v => ballot(v.index, v.vp)),
      aggregate: {
        election_id: PROPOSAL_ID,
        num_candidates: NUM_CANDIDATES,
        ciphertexts: sum(inCap, legacyWeight)
      }
    },
    divergent: {
      note:
        'A holder of 995,500 on a weighted proposal. Legacy counted it in full — it ' +
        'had no ceiling — and current counts it at maxWeight. The two aggregates ' +
        'below therefore differ by design, and this fixture exists to record that ' +
        'rather than to assert it away. Counting the whale in full would today be ' +
        'rejected by the committee as INVALID_ATTESTATION, so the legacy answer is ' +
        'not merely different, it is now unusable.',
      ballots: overCap.map(v => ballot(v.index, v.vp)),
      legacyAggregate: {
        election_id: PROPOSAL_ID,
        num_candidates: NUM_CANDIDATES,
        ciphertexts: sum(overCap, legacyWeight)
      },
      currentAggregate: {
        election_id: PROPOSAL_ID,
        num_candidates: NUM_CANDIDATES,
        ciphertexts: sum(overCap, currentWeight)
      }
    },
    boundary: {
      note:
        'Total admitted weight past 2^53, where a JS number stops being exact. The ' +
        'digest encodes it as a decimal string for this reason; a float here changes ' +
        'the digest and the committee never reaches quorum.',
      totalAdmittedWeight: '9007199254740993', // 2^53 + 1
      asJsNumber: Number('9007199254740993'),
      exactRoundTrip: BigInt('9007199254740993').toString()
    }
  };

  writeFileSync(OUT, `${JSON.stringify(corpus, null, 2)}\n`);
  console.log(`wrote ${OUT}`);
  console.log(`  equivalent: ${corpus.equivalent.ballots.length} ballots`);
  console.log(
    `  divergent : legacy ≠ current → ${
      corpus.divergent.legacyAggregate.ciphertexts[0].c1 !==
      corpus.divergent.currentAggregate.ciphertexts[0].c1
    }`
  );
  console.log(
    `  boundary  : 2^53+1 survives as a number → ${
      String(corpus.boundary.asJsNumber) === corpus.boundary.exactRoundTrip
    }`
  );
}

main();
