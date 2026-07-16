/**
 * High-level actor wrappers — collapse the multi-step voter and tally
 * aggregator flows into single calls so consumers do not have to thread
 * Fiat–Shamir transcripts, witness randomness, or BSGS tables by hand.
 *
 * Voter:    `buildBallot`  — encrypt → range/bit ORs → budget proof →
 *                            encode → canonicalize → Schnorr-sign, all in
 *                            one call. Returns ONLY `BallotInputs`; the
 *                            per-ciphertext randomness `r_j` never leaves
 *                            this function, so the caller cannot forget
 *                            to discard it (Munich §7.1 coercion
 *                            resistance).
 *
 * Tally:    `recoverTally` — verify every share, Lagrange-combine a
 *                            threshold subset per candidate, BSGS-
 *                            recover each integer total against a
 *                            shared baby-step table.
 *
 * Both wrappers compose the lower-level primitives that remain exported
 * (`encrypt`, `proveOR`, `proveBudget*`, `partialDecrypt`,
 * `verifyDecryptionShare`, `combineShares`, `recoverDiscreteLogWithTable`,
 * …). Consumers generating test vectors, running audits, or wiring up
 * Variant-B-with-bespoke-aggregation paths still reach for the
 * primitives directly.
 */

import { keccak256 } from 'viem';

import { G1Point, G2Point } from '../crypto/curve';
import { encodeBallotValidityProof, encodeSchnorr } from '../contract/codec';
import { encrypt, sumCts } from './encrypt';
import {
  buildBabyStepTable,
  combineShares,
  recoverDiscreteLogWithTable,
  verifyDecryptionShare,
} from './decrypt';
import {
  proveBudgetAtMost,
  proveBudgetExact,
  proveOR,
} from './proofs';
import { schnorrSign } from './schnorr';
import { Transcript } from './transcript';
import type {
  BallotValidityProof,
  Ciphertext,
  PartialDecryption,
} from './types';
import {
  type BallotInputs,
  type BallotVerifyParams,
  canonicalBallotMessage,
  rangeCandidates,
  seedBallotTranscript,
} from './verify';

// ---------- buildBallot (voter wrapper) ----------

export interface BuildBallotArgs {
  /** Committee public key the voter encrypts against. */
  mpk: G2Point;
  /** Election identifier (32 bytes), bound into the transcript and signature. */
  electionId: Uint8Array;
  /** Voter pseudonym (32 bytes) issued by the WR-Server. */
  pseudonym: Uint8Array;
  /**
   * Ephemeral Schnorr secret key produced by the voter via
   * `schnorrKeygen()` and registered with the WR-Server. The wrapper
   * never persists it; the caller is still expected to drop it locally
   * after submission (per the spec's per-ballot ephemerality rule).
   */
  sk: bigint;
  /** Matching `vk = sk · P₁`, the value the WR-Server attested over. */
  vk: G1Point;
  /**
   * Per-candidate vote vector. Variant A: `votes.length === ℓ` and each
   * `votes[j] ∈ [0, B]`. Variant B: same shape; each component must fit
   * in `d = ⌈log₂(B+1)⌉` bits.
   */
  votes: bigint[];
  /** Election parameters — must match the verifier's exactly. */
  params: BallotVerifyParams;
  /** Opaque WR-Server attestation bytes; passed through unchanged. */
  wrAttestation: Uint8Array;
}

/**
 * One-call ballot assembly. Internally:
 *
 *   1. Encrypts each vote (Variant A) or each bit (Variant B) under
 *      `mpk`, sampling fresh randomness per ciphertext.
 *   2. Seeds the ballot Fiat–Shamir transcript with `(electionId, mpk,
 *      vk, ciphertexts, params)` (`seedBallotTranscript`).
 *   3. Runs one OR proof per candidate (Variant A) or per bit (Variant
 *      B), each tagged into the running transcript.
 *   4. Homomorphically sums the ciphertexts (Variant A) or
 *      `Σ_j Σ_k 2^k · c_{j,k}` (Variant B) and produces the matching
 *      budget proof (`exact` or `atMost`).
 *   5. Encodes the validity proof, builds the canonical preimage, and
 *      Schnorr-signs `keccak256(preimage)` with `sk`.
 *
 * The per-ciphertext randomness `r_j` is dropped when this function
 * returns; the caller therefore cannot accidentally retain it. The
 * caller IS still responsible for discarding `sk` and `votes` once
 * submission is acknowledged.
 *
 * Throws on shape mismatches between `votes` and `params` rather than
 * silently producing a ballot that the verifier will reject.
 */
export function buildBallot(args: BuildBallotArgs): BallotInputs {
  const {
    mpk,
    electionId,
    pseudonym,
    sk,
    vk,
    votes,
    params,
    wrAttestation,
  } = args;

  if (mpk.isIdentity()) {
    throw new Error('buildBallot: mpk is the identity — rejected (would reveal vote values)');
  }

  if (votes.length !== params.numCandidates) {
    throw new Error(
      `buildBallot: votes.length (${votes.length}) != params.numCandidates (${params.numCandidates})`,
    );
  }

  // Variant B: enforce d === ⌈log₂(B+1)⌉ exactly, mirroring verifyBallot.
  // Catches misconfigured params at the prover side instead of producing a
  // ballot every verifier rejects.
  if (params.variant === 'B') {
    if (params.d === undefined || params.d <= 0) {
      throw new Error('buildBallot: Variant B requires positive params.d');
    }
    const expectedD = Math.ceil(Math.log2(params.budget + 1));
    if (params.d !== expectedD) {
      throw new Error(
        `buildBallot: Variant B d (${params.d}) must equal ⌈log₂(B+1)⌉ = ${expectedD}`,
      );
    }
  }

  // Per-component bounds on each vote.
  if (params.variant === 'B') {
    const limit = 1n << BigInt(params.d!);
    for (let j = 0; j < votes.length; j++) {
      const v = votes[j]!;
      if (v < 0n || v >= limit) {
        throw new Error(
          `buildBallot: vote[${j}] = ${v} out of [0, 2^${params.d}) for Variant B`,
        );
      }
    }
  } else {
    const B = BigInt(params.budget);
    for (let j = 0; j < votes.length; j++) {
      const v = votes[j]!;
      if (v < 0n || v > B) {
        throw new Error(
          `buildBallot: vote[${j}] = ${v} out of [0, ${B}] for Variant A`,
        );
      }
    }
  }

  // Aggregate-vote bound. `mode === 'exact'` requires Σ votes == B; `atMost`
  // requires Σ votes ≤ B. Without this check, a vote vector that violates
  // the budget would still encrypt fine, the budget proof would fail at the
  // prover OR (worse) decode silently and be rejected by the verifier — the
  // caller never learns the input was wrong.
  const B = BigInt(params.budget);
  let voteSum = 0n;
  for (let j = 0; j < votes.length; j++) voteSum += votes[j]!;
  if (params.mode === 'exact') {
    if (voteSum !== B) {
      throw new Error(
        `buildBallot: mode='exact' requires Σvotes == ${B}, got ${voteSum}`,
      );
    }
  } else {
    if (voteSum > B) {
      throw new Error(
        `buildBallot: mode='atMost' requires Σvotes ≤ ${B}, got ${voteSum}`,
      );
    }
  }

  // Verify (sk, vk) are a matched pair: vk == sk · P₁. Catches a developer-
  // mistake class (mismatched keypair, swapped voters) at construction time
  // rather than producing a ballot whose Schnorr signature fails at the
  // verifier.
  {
    const P1 = G1Point.generator();
    const expected = P1.mul(sk);
    P1.destroyWasm();
    const ok = expected.equals(vk);
    expected.destroyWasm();
    if (!ok) throw new Error('buildBallot: vk does not match sk · P₁ (mismatched keypair)');
  }

  // 1. Encrypt.
  let cts: Ciphertext[];
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
        const bit = (v >> BigInt(k)) & 1n;
        const { ct, r } = encrypt(bit, mpk);
        cts.push(ct);
        rs.push(r);
      }
    }
  }

  // 2. Seed transcript.
  const t = seedBallotTranscript(electionId, mpk, vk, cts, params);

  // 3. Range / bit proofs.
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

  // 4. Aggregate ciphertext + randomness, then budget proof.
  let ctSum: Ciphertext;
  let rSum: bigint;
  if (params.variant === 'A') {
    ctSum = sumCts(cts);
    rSum = rs.reduce((a, r) => a + r, 0n);
  } else {
    const d = params.d!;
    rSum = 0n;
    let acc: Ciphertext | null = null;
    for (let i = 0; i < cts.length; i++) {
      const w   = 1n << BigInt(i % d);
      const wCt = { c1: cts[i]!.c1.mul(w), c2: cts[i]!.c2.mul(w) };
      rSum += rs[i]! * w;
      if (acc === null) {
        acc = wCt;
      } else {
        const prev: Ciphertext = acc;
        acc = { c1: prev.c1.add(wCt.c1), c2: prev.c2.add(wCt.c2) };
        prev.c1.destroyWasm();
        prev.c2.destroyWasm();
        wCt.c1.destroyWasm();
        wCt.c2.destroyWasm();
      }
    }
    ctSum = acc!;
  }

  const V = votes.reduce((a, b) => a + b, 0n);
  t.append('ballot:budget', new Uint8Array([0]));
  const budget =
    params.mode === 'exact'
      ? proveBudgetExact(
          { ctSum, mpk, budget: BigInt(params.budget) },
          { rSum },
          t,
        )
      : proveBudgetAtMost(
          { ctSum, mpk, budget: BigInt(params.budget) },
          { rSum, V },
          t,
        );

  // Free ctSum only when sumCts allocated a fresh pair (length > 1).
  // When length === 1, sumCts returns cts[0] directly — freeing here would
  // double-free when the cts cleanup loop runs below.
  if (params.variant === 'A' && cts.length > 1) {
    ctSum.c1.destroyWasm();
    ctSum.c2.destroyWasm();
  }

  const bvp: BallotValidityProof = {
    version: 0x01,
    variant: params.variant,
    rangeOrBit,
    budget,
  };
  const zkProof = encodeBallotValidityProof(bvp);

  // After encoding to bytes, free all G2 commitment points in rangeOrBit.
  for (const orProof of rangeOrBit) {
    for (const br of orProof.branches) {
      br.a1.destroyWasm();
      br.a2.destroyWasm();
    }
  }
  if (budget.mode === 'atMost') {
    for (const br of budget.proof.branches) {
      br.a1.destroyWasm();
      br.a2.destroyWasm();
    }
  }

  // 5. Canonical preimage + Schnorr.
  const ciphertextBytes: [Uint8Array, Uint8Array][] = cts.map((ct) => [
    ct.c1.toBytes(),
    ct.c2.toBytes(),
  ]);
  for (const ct of cts) {
    ct.c1.destroyWasm();
    ct.c2.destroyWasm();
  }

  const preimage = canonicalBallotMessage({
    electionId,
    pseudonym,
    ciphertexts: ciphertextBytes,
    zkProof,
  });
  const sig = schnorrSign(sk, vk, keccak256(preimage, 'bytes'));
  const voterSignature = encodeSchnorr(sig);
  sig.R.destroyWasm();

  return {
    electionId,
    pseudonym,
    vk: vk.toBytes(),
    ciphertexts: ciphertextBytes,
    zkProof,
    voterSignature,
    wrAttestation,
  };
}

// ---------- recoverTally (aggregator wrapper) ----------

export interface RecoverTallyArgs {
  /**
   * Per-candidate homomorphic ciphertext sums. `ctSums.length` defines
   * the number of candidates; `recoverTally` returns one tally per
   * entry in matching order.
   */
  ctSums: readonly Ciphertext[];
  /**
   * Partial decryption shares, indexed `[candidateIndex][shareIndex]`.
   * Outer length must equal `ctSums.length`. Each inner array supplies
   * at least `threshold + 1` shares — the wrapper verifies all of them
   * (so a faulty keyper is caught even if it would have been outside
   * the chosen subset) and then Lagrange-combines the first
   * `threshold + 1`.
   */
  sharesPerCandidate: readonly (readonly PartialDecryption[])[];
  /** Threshold `t` from the DKG. The wrapper takes `t + 1` shares per candidate. */
  threshold: number;
  /**
   * Committee public keys indexed by `keyperIndex - 1` (i.e.
   * `committeePKs[k - 1] = mpk_k`). Must cover every keyper that
   * appears in `sharesPerCandidate`.
   */
  committeePKs: readonly G2Point[];
  /**
   * Upper bound on each per-candidate tally — used to size the BSGS
   * baby-step table. Munich-typical: `BigInt(numBallots) * BigInt(B)`.
   */
  upperBound: bigint;
  /**
   * Caller-supplied factory that returns a fresh `Transcript` seeded
   * EXACTLY the way the keyper seeded it before calling
   * `partialDecrypt`. The wrapper invokes it once per (candidate j,
   * share) pair for share verification. Must return a fresh transcript
   * on every call — verification consumes it.
   *
   * Typical implementation:
   *   (j, _share) => {
   *     const t = new Transcript('SHUTTER-VOTE-DECRYPT-v1');
   *     t.append('electionId', electionId);
   *     t.append('candidate', u16BE(j));
   *     return t;
   *   }
   *
   * `share` is passed in case the keyper transcript also bound the
   * keyper index outside `partialDecrypt`'s own internal seeding;
   * implementations that do not need it can ignore it.
   */
  transcriptFor: (
    candidateIndex: number,
    share: PartialDecryption,
  ) => Transcript;
}

/**
 * One-call tally recovery. Per candidate:
 *
 *   1. Verifies every supplied share against its committee public key
 *      and the caller-supplied transcript factory. Throws on the first
 *      bad share with a message naming the candidate index and keyper.
 *   2. Picks the first `threshold + 1` verified shares and Lagrange-
 *      interpolates them at zero (`combineShares`) to obtain
 *      `τ_j = V_j · P₂`.
 *   3. Looks `τ_j` up in a single shared baby-step table built once
 *      from `upperBound`.
 *
 * Returns the per-candidate integer tallies in the same order as
 * `ctSums`. Throws if any share fails verification, if a referenced
 * keyper index has no entry in `committeePKs`, or if a recovered tally
 * exceeds `upperBound` (the latter signals a tally-pipeline bug —
 * admitted ballots whose homomorphic sum overshoots the declared
 * bound).
 */
export function recoverTally(args: RecoverTallyArgs): bigint[] {
  const {
    ctSums,
    sharesPerCandidate,
    threshold,
    committeePKs,
    upperBound,
    transcriptFor,
  } = args;

  if (!Number.isInteger(threshold) || threshold < 0) {
    throw new Error(
      `recoverTally: threshold (${threshold}) must be a non-negative integer`,
    );
  }
  if (ctSums.length !== sharesPerCandidate.length) {
    throw new Error(
      `recoverTally: ctSums.length (${ctSums.length}) != sharesPerCandidate.length (${sharesPerCandidate.length})`,
    );
  }
  const need = threshold + 1;

  const table = buildBabyStepTable(upperBound);
  const out: bigint[] = new Array(ctSums.length);

  for (let j = 0; j < ctSums.length; j++) {
    const ctSum = ctSums[j]!;
    const shares = sharesPerCandidate[j]!;
    if (shares.length < need) {
      throw new Error(
        `recoverTally: candidate ${j} has ${shares.length} shares, need at least ${need}`,
      );
    }

    // Verify every supplied share — even the ones beyond the threshold
    // subset, so a faulty keyper surfaces rather than getting silently
    // dropped just because it wasn't picked for combination.
    for (let i = 0; i < shares.length; i++) {
      const share = shares[i]!;
      if (
        !Number.isInteger(share.keyperIndex) ||
        share.keyperIndex < 1 ||
        share.keyperIndex > committeePKs.length
      ) {
        throw new Error(
          `recoverTally: candidate ${j} share[${i}] has out-of-range keyperIndex ${share.keyperIndex}`,
        );
      }
      const committeePK = committeePKs[share.keyperIndex - 1]!;
      const t = transcriptFor(j, share);
      if (!verifyDecryptionShare(ctSum, share, committeePK, t)) {
        throw new Error(
          `recoverTally: candidate ${j} share from keyper ${share.keyperIndex} failed verification`,
        );
      }
    }

    const subset = shares.slice(0, need);
    const alphas = subset.map((s) => BigInt(s.keyperIndex));
    const tau = combineShares(subset, alphas, ctSum);
    out[j] = recoverDiscreteLogWithTable(tau, table);
  }

  return out;
}

// ---------- helpers ----------

function u16BE(n: number): Uint8Array {
  if (n < 0 || n > 0xffff) throw new Error(`u16 out of range: ${n}`);
  const out = new Uint8Array(2);
  out[0] = (n >>> 8) & 0xff;
  out[1] = n & 0xff;
  return out;
}
