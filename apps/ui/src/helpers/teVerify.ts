/**
 * Checks a private tally in the browser.
 *
 * Uses the hub's public data (encrypted ballots, the committee's aggregate, the
 * decryption shares and the proposal's TE config) to confirm the published scores
 * without trusting whoever published them. Two steps:
 *
 *   1. `aggregateBallots` adds up the encrypted ballots, each weighted by its voting
 *      power, and compares the sum to the aggregate the keypers signed. It also
 *      computes `derivedBound = budget × Σ(weights it counted)`.
 *   2. `verifyTally` checks every share's DLEQ proof, combines a quorum of shares
 *      into τ per candidate, and checks each published total with
 *      `total · P₂ == τ`.
 *
 * The client never solves the discrete log (it does not call the SDK's
 * `recoverTally`). The search is O(√bound) in time and memory, and this WASM build
 * aborts above a bound of about 2.5e9, which a 1,000-voter weighted proposal can
 * reach. A wrong published total always fails the check.
 *
 * Everything is in scaled units, so this checks that the committee counted the
 * ballots correctly, not that the proposal's `scale` was a good choice.
 *
 * The caller compares the tallies to the proposal's published scores, so the UI
 * can show a mismatch in the right place.
 */
import { arrayify, hexlify } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/keccak256';
import {
  addCt,
  BallotVerifyParams,
  Ciphertext,
  decodeDLEQ,
  G2Point,
  msmCt,
  PartialDecryption,
  Transcript,
  verifyTallyAgainstTotals
} from '@shutter-network/urban-verified-crypto';
import { ensureCurvesInit } from './teBallot';

const DECRYPT_TRANSCRIPT_LABEL = 'SHUTTER-VOTE-DECRYPT-v1';

function u16BE(n: number): Uint8Array {
  const b = new Uint8Array(2);
  b[0] = (n >> 8) & 0xff;
  b[1] = n & 0xff;
  return b;
}

/**
 * Short keccak256 fingerprint of one or more hex strings (for example a master
 * public key, or an aggregate's ciphertexts), so the UI can show them for visual
 * comparison. Display only; it is not part of any check.
 */
export function fingerprintHex(parts: string[]): string {
  const joined = parts.map(p => p.replace(/^0x/, '')).join('');
  const digest = keccak256(`0x${joined}`).replace(/^0x/, '');
  return `${digest.slice(0, 8)}…${digest.slice(-8)}`;
}

/** The hub URL of one private-voting route for a proposal. */
export function endpoint(
  apiBaseUrl: string,
  proposalId: string,
  route: string
): string {
  return `${apiBaseUrl.replace(/\/$/, '')}/proposal/${encodeURIComponent(proposalId)}/${route}`;
}

export interface AuditPayload {
  te_mpk: string;
  te_config: BallotVerifyParams | null;
  te_committee_pks: string[];
  te_threshold_t: number;
  te_threshold_n: number;
  te_keyper_addresses: string[];
  aggregate: {
    num_candidates: number;
    ciphertexts: Array<{ c1: string; c2: string }>;
    admitted?: number[];
    exclusions?: Array<{ sequenceNumber: number; reason: string }>;
  };
  shares: Array<{
    keyper_index: number;
    candidate: number;
    sigma: string;
    proof_e: string;
    proof_z: string;
  }>;
  /**
   * The committee's published result, or `null` before there is one. `totals` are
   * decimal strings because a tally can exceed 2^53, which a JSON number cannot
   * hold exactly.
   */
  te_result?: {
    totals: string[];
    keyper_indices: number[];
    bsgs_bound: string;
  } | null;
}

/**
 * One encrypted ballot, read from the committee's own feed (`te_sgp_ballots`).
 * Only the ciphertexts are fetched: proofs are not re-checked here and are most of
 * a ballot's size.
 */
export interface AuditBallot {
  /** Position in the committee's order; `admitted` and `exclusions` refer to it. */
  sequenceNumber?: number;
  voter: string;
  vp: number;
  choice: {
    ciphertexts: Array<{ c1: string; c2: string }>;
  } | null;
}

export interface BallotsPayload {
  /**
   * The unit this proposal's tally counts in; 1 means no scaling. Must be applied
   * exactly as the committee applies it, or the recomputed aggregate will not match.
   */
  scale?: number | null;
  ballots: AuditBallot[];
}

export interface BallotAggregateResult {
  /** Total ballots returned by the hub. */
  total: number;
  /**
   * Ballots that added weight. Lower than `total` when ballots are not admitted or
   * round to zero weight; 0 when nobody voted, which is not a failure.
   */
  contributing: number;
  /** Recomputed vp-weighted aggregate equals the published aggregate. */
  aggregateMatches: boolean;
  exclusions: Array<{ sequenceNumber: number; reason: string }>;
  admittedSetResolved: boolean;
  /**
   * Admitted ballots whose weight rounds to zero at this proposal's scale. Empty
   * unless `scale > 1`.
   */
  scaledToZero: Array<{ voter: string; vp: number }>;
  /**
   * Sum of the weights this client counted. It bounds the published totals, so it
   * must be computed here, not taken from the committee.
   */
  totalWeight: bigint;
}

/**
 * Compressed G2 point at infinity (compression and infinity bits set, then zeros).
 * This is the sum of no ciphertexts, and what the keypers publish for each
 * candidate when no ballots were admitted.
 */
const IDENTITY_G2 = `0x${'c0'.padEnd(192, '0')}`;

export interface VerifyResult {
  /** The committee's published per-candidate totals, as exact integers. */
  tallies: bigint[];
  /** Whether the totals match the aggregate and the decryption shares. */
  verified: boolean;
  /** The reason when `verified` is false; `null` otherwise. */
  reason: string | null;
  /** `budget × Σ(counted weights)`, derived from the ballots this client read. */
  derivedBound: bigint;
  /**
   * Whether the committee's `bsgs_bound` equals `derivedBound`. Informational only:
   * a mismatch suggests the committee counted a different set of ballots.
   */
  boundMatchesPublished: boolean | null;
}

/**
 * Fetches the public audit payload from the hub. `apiBaseUrl` must end at the
 * `/api` prefix (the same one the sequencer's vote ingest uses).
 */
export async function fetchAuditPayload(
  apiBaseUrl: string,
  proposalId: string
): Promise<AuditPayload> {
  const url = endpoint(apiBaseUrl, proposalId, 'te_decryption_shares');
  const r = await fetch(url, { credentials: 'omit' });
  if (!r.ok) throw new Error(`hub ${r.status}: ${await r.text()}`);
  return (await r.json()) as AuditPayload;
}

/**
 * Fetches every encrypted ballot, page by page, from the same feed the committee
 * tallied from, so the sequence numbers match its `admitted` and `exclusions`.
 * `apiBaseUrl` is the same as for `fetchAuditPayload`.
 *
 * @param scale the proposal's `te_config.scale`, the unit its scores count in
 */
export async function fetchBallotsPayload(
  apiBaseUrl: string,
  proposalId: string,
  scale: number
): Promise<BallotsPayload> {
  const url = endpoint(apiBaseUrl, proposalId, 'te_sgp_ballots');
  const ballots: AuditBallot[] = [];
  for (;;) {
    const r = await fetch(`${url}?fields=ciphertexts&start=${ballots.length}`, {
      credentials: 'omit'
    });
    if (!r.ok) throw new Error(`hub ${r.status}: ${await r.text()}`);
    const page = (await r.json()) as { ballots: any[]; total: number };
    for (const { ballot, sequenceNumber } of page.ballots) {
      ballots.push({
        sequenceNumber,
        voter: ballot.pseudonym,
        vp: Number(ballot.attestation?.weight ?? 0),
        choice: { ciphertexts: ballot.ciphertexts }
      });
    }
    if (!page.ballots.length || ballots.length >= page.total) break;
  }
  return { scale, ballots };
}

function ctToHex(ct: Ciphertext): { c1: string; c2: string } {
  return { c1: hexlify(ct.c1.toBytes()), c2: hexlify(ct.c2.toBytes()) };
}

/**
 * Step 1: adds up the encrypted ballots and checks the sum matches the aggregate
 * the keypers decrypted.
 *
 * Each admitted ballot's ciphertexts are added homomorphically, weighted as the
 * keypers weight them (the credential weight at the proposal's scale), and the
 * result is compared byte for byte with `expectedAggregate`.
 *
 * Ballot zero-knowledge proofs are not re-checked here. The sequencer checks them
 * before storing a ballot (`verifyTeBallot` in apps/sequencer/src/helpers/te.ts),
 * and checking each one in the browser takes seconds per ballot.
 */
export async function aggregateBallots(
  payload: BallotsPayload,
  expectedAggregate: AuditPayload['aggregate'],
  onProgress?: (done: number, total: number) => void
): Promise<BallotAggregateResult> {
  await ensureCurvesInit();

  if (!expectedAggregate) {
    throw new Error('No published aggregate to compare the ballots against');
  }
  const numCandidates = expectedAggregate.num_candidates;
  const acc: (Ciphertext | null)[] = new Array(numCandidates).fill(null);
  let contributing = 0;
  let totalWeight = 0n;
  const scaledToZero: BallotAggregateResult['scaledToZero'] = [];

  const scale =
    typeof payload.scale === 'number' && payload.scale > 1
      ? BigInt(Math.floor(payload.scale))
      : 1n;

  /**
   * Ballots are weighted with one multi-scalar multiplication per chunk, which is
   * much faster than one scalar multiplication per ballot (about 6 ms each per
   * candidate). Chunks keep memory bounded, since the WASM heap is a fixed 16 MB:
   * 256 ballots × 20 candidates (the maximum) × 2 points is about 2.9 MB. Adding
   * the chunk sums gives exactly the same result as one pass.
   */
  const CHUNK_BALLOTS = 256;
  const pendingWeights: bigint[] = [];
  const pendingCts: Ciphertext[][] = Array.from(
    { length: expectedAggregate.num_candidates },
    () => []
  );

  function flushChunk(): void {
    if (pendingWeights.length === 0) return;
    for (let j = 0; j < pendingCts.length; j++) {
      const partial = msmCt(pendingWeights, pendingCts[j]!);
      if (acc[j] === null) {
        acc[j] = partial;
      } else {
        const prev = acc[j]!;
        acc[j] = addCt(prev, partial);
        prev.c1.destroyWasm();
        prev.c2.destroyWasm();
        partial.c1.destroyWasm();
        partial.c2.destroyWasm();
      }
      for (const ct of pendingCts[j]!) {
        ct.c1.destroyWasm();
        ct.c2.destroyWasm();
      }
      pendingCts[j] = [];
    }
    pendingWeights.length = 0;
  }

  const admitted = Array.isArray(expectedAggregate.admitted)
    ? new Set(expectedAggregate.admitted)
    : null;
  const exclusions = Array.isArray(expectedAggregate.exclusions)
    ? expectedAggregate.exclusions
    : [];

  const present = new Set(
    payload.ballots
      .map(b => b.sequenceNumber)
      .filter((n): n is number => typeof n === 'number')
  );
  const admittedSetResolved =
    admitted === null || [...admitted].every(n => present.has(n));

  try {
    let processed = 0;
    for (const b of payload.ballots) {
      processed++;
      const env = b.choice;
      if (!env) continue;
      if (admitted !== null) {
        // Without a sequence number we cannot tell whether the committee counted it.
        if (typeof b.sequenceNumber !== 'number') continue;
        if (!admitted.has(b.sequenceNumber)) continue;
      }

      const raw = BigInt(Math.round(b.vp));
      // Divide by scale rounding half up, matching SGP's `(w + s//2) // s`.
      // `Math.round(w/s)` would differ from Python at exactly `.5`.
      const w = scale > 1n ? (raw + scale / 2n) / scale : raw;
      if (raw > 0n && w === 0n) {
        // Reported so the panel can explain the ballot instead of it looking missing.
        scaledToZero.push({ voter: b.voter, vp: b.vp });
      }
      if (w <= 0n) continue;
      contributing++;
      totalWeight += w;

      pendingWeights.push(w);
      const cts: Ciphertext[] = env.ciphertexts.map(c => ({
        c1: G2Point.fromBytes(arrayify(c.c1)),
        c2: G2Point.fromBytes(arrayify(c.c2))
      }));
      for (let j = 0; j < numCandidates; j++) pendingCts[j]!.push(cts[j]!);

      if (pendingWeights.length >= CHUNK_BALLOTS) {
        flushChunk();
        onProgress?.(processed, payload.ballots.length);
      }
    }
    flushChunk();
    onProgress?.(payload.ballots.length, payload.ballots.length);

    let aggregateMatches = true;
    for (let j = 0; j < numCandidates; j++) {
      const want = expectedAggregate.ciphertexts[j];
      const got =
        acc[j] === null
          ? { c1: IDENTITY_G2, c2: IDENTITY_G2 }
          : ctToHex(acc[j]!);
      if (
        got.c1.toLowerCase() !== want.c1.toLowerCase() ||
        got.c2.toLowerCase() !== want.c2.toLowerCase()
      ) {
        aggregateMatches = false;
        break;
      }
    }

    return {
      total: payload.ballots.length,
      contributing,
      scaledToZero,
      aggregateMatches,
      exclusions,
      admittedSetResolved,
      totalWeight
    };
  } finally {
    for (const ct of acc) {
      if (ct !== null) {
        ct.c1.destroyWasm();
        ct.c2.destroyWasm();
      }
    }
  }
}

/**
 * Why there is no verified tally yet, worked out from the public share counts and
 * whether a result is published:
 *
 *   - `awaiting-shares`: some candidate has fewer than a quorum of shares. A keyper
 *     problem, not the coordinator's.
 *   - `awaiting-coordinator`: all shares are there but no result is published. The
 *     coordinator's problem.
 *
 * The coordinator's `tallyStallReason` can add detail to the second case. It is not
 * signed, so show it as the coordinator's claim and never use it to trigger
 * automatic actions.
 */
export type TallyDiagnosis =
  | { kind: 'published' }
  | { kind: 'awaiting-shares'; candidatesShort: number; need: number }
  | { kind: 'awaiting-coordinator' };

export function diagnoseTally(payload: AuditPayload): TallyDiagnosis {
  const need = payload.te_threshold_t;
  const numCandidates = payload.aggregate?.num_candidates ?? 0;

  const perCandidate = new Array(numCandidates).fill(0);
  for (const s of payload.shares) {
    if (s.candidate >= 0 && s.candidate < numCandidates) {
      perCandidate[s.candidate]++;
    }
  }
  const candidatesShort = perCandidate.filter(n => n < need).length;
  if (candidatesShort > 0) {
    return { kind: 'awaiting-shares', candidatesShort, need };
  }

  const totals = payload.te_result?.totals;
  if (!totals || totals.length === 0) return { kind: 'awaiting-coordinator' };
  return { kind: 'published' };
}

/**
 * Step 2: checks the committee's published totals against the aggregate and the
 * decryption shares.
 *
 * Verifies every share's DLEQ proof, combines a quorum of shares into τ per
 * candidate, and checks `total · P₂ == τ`. The discrete log is unique, so only the
 * true total passes; this takes about 6 ms per candidate, while solving it with
 * `recoverTally` aborts above a bound of about 2.5e9 in this WASM build.
 *
 * `derivedBound` must be `budget × Σ(weights counted)` from `aggregateBallots`,
 * never the committee's value. The range check against it stops `T + q` (the same
 * group element as `T`) from passing as a huge integer.
 *
 * Rejects on malformed input, too few shares, or no published result. A tally that
 * fails the check resolves with `verified: false` and a reason, so the UI can say
 * which check failed.
 */
export async function verifyTally(
  proposalId: string,
  payload: AuditPayload,
  derivedBound: bigint
): Promise<VerifyResult> {
  await ensureCurvesInit();

  const { aggregate, te_committee_pks, te_threshold_t, shares } = payload;
  if (!aggregate) {
    throw new Error(
      'No encrypted ballots were cast, so there is no tally to decrypt or verify.'
    );
  }
  const numCandidates = aggregate.num_candidates;
  if (numCandidates !== aggregate.ciphertexts.length) {
    throw new Error(
      `aggregate.num_candidates=${numCandidates} disagrees with ciphertexts.length=${aggregate.ciphertexts.length}`
    );
  }

  const ctSums: Ciphertext[] = aggregate.ciphertexts.map(({ c1, c2 }) => ({
    c1: G2Point.fromBytes(arrayify(c1)),
    c2: G2Point.fromBytes(arrayify(c2))
  }));

  const committeePKs = te_committee_pks.map(hex =>
    G2Point.fromBytes(arrayify(hex))
  );

  // Group shares per candidate (0-indexed). The DLEQ proof is proof_e ‖ proof_z
  // (32 + 32 bytes), the layout `decodeDLEQ` expects.
  const sharesPerCandidate: PartialDecryption[][] = Array.from(
    { length: numCandidates },
    () => []
  );
  for (const s of shares) {
    if (s.candidate < 0 || s.candidate >= numCandidates) continue;
    const sigma = G2Point.fromBytes(arrayify(s.sigma));
    const proofBytes = new Uint8Array(64);
    proofBytes.set(arrayify(s.proof_e), 0);
    proofBytes.set(arrayify(s.proof_z), 32);
    sharesPerCandidate[s.candidate].push({
      keyperIndex: s.keyper_index,
      sigma,
      proof: decodeDLEQ(proofBytes)
    });
  }
  // te_threshold_t is the quorum: the number of keypers required, not the number
  // of faults tolerated.
  try {
    if (!sharesPerCandidate.every(arr => arr.length >= te_threshold_t)) {
      throw new Error(
        `not enough decryption shares per candidate (need t=${te_threshold_t})`
      );
    }

    const electionIdBytes = arrayify(proposalId);
    const published = payload.te_result;
    if (!published || published.totals.length === 0) {
      // Nothing to check against. Solving for the result is too heavy for a browser.
      throw new Error(
        'The committee has not published a result for this proposal yet, so there ' +
          'is nothing to verify against.'
      );
    }

    // Parse from decimal strings so totals above 2^53 stay exact.
    const tallies = published.totals.map(t => BigInt(t));

    const { ok, reason } = verifyTallyAgainstTotals({
      ctSums,
      sharesPerCandidate,
      // The SDK takes the number of tolerated faults, i.e. quorum - 1.
      threshold: te_threshold_t - 1,
      committeePKs,
      claimedTotals: tallies,
      upperBound: derivedBound,
      transcriptFor: (j: number) => {
        const t = new Transcript(DECRYPT_TRANSCRIPT_LABEL);
        t.append('electionId', electionIdBytes);
        t.append('candidate', u16BE(j));
        return t;
      }
    });

    // Informational only; the check above already settles the totals.
    let boundMatchesPublished: boolean | null = null;
    try {
      boundMatchesPublished = BigInt(published.bsgs_bound) === derivedBound;
    } catch {
      boundMatchesPublished = false;
    }

    return {
      tallies,
      verified: ok,
      reason,
      derivedBound,
      boundMatchesPublished
    };
  } finally {
    for (const ct of ctSums) {
      ct.c1.destroyWasm();
      ct.c2.destroyWasm();
    }
    for (const pk of committeePKs) {
      pk.destroyWasm();
    }
    for (const candidateShares of sharesPerCandidate) {
      for (const share of candidateShares) {
        share.sigma.destroyWasm();
      }
    }
  }
}

/** How far along a verification is, for a progress indicator. */
export interface VerifyProgress {
  phase: 'aggregate' | 'tally';
  done: number;
  total: number;
}

export interface VerifyAllResult {
  ballots: BallotAggregateResult;
  tally: VerifyResult;
}

/**
 * Runs both steps: recomputes the aggregate from the ballots, then checks the
 * published totals. Pure computation on fetched payloads (no network or DOM), so
 * it can run in `teVerifyWorker.ts` and in Node tests.
 *
 * `onProgress` is called between chunks. Most of the time goes to the aggregate
 * step: decompressing each ciphertext takes about 2.8 ms (the subgroup check in
 * `G2Point.fromBytes`), so 1,000 ballots with 5 choices take about 28 s.
 */
export async function verifyAll(
  args: {
    proposalId: string;
    payload: AuditPayload;
    ballotsPayload: BallotsPayload;
    budget: number;
  },
  onProgress?: (p: VerifyProgress) => void
): Promise<VerifyAllResult> {
  const { proposalId, payload, ballotsPayload, budget } = args;

  const ballots = await aggregateBallots(
    ballotsPayload,
    payload.aggregate,
    (done, total) => onProgress?.({ phase: 'aggregate', done, total })
  );

  // Computed from the ballots counted here, never taken from the committee.
  const derivedBound = ballots.totalWeight * BigInt(budget);

  onProgress?.({ phase: 'tally', done: 0, total: 1 });
  const tally = await verifyTally(proposalId, payload, derivedBound);
  onProgress?.({ phase: 'tally', done: 1, total: 1 });

  return { ballots, tally };
}

/**
 * Builds a bundle that anyone can re-check offline (for example with the SDK's CLI)
 * without trusting this UI or the hub. It holds the public audit payload, every
 * encrypted ballot's ciphertexts (not its proofs) and this client's results. It
 * contains only public data.
 */
export function buildVerificationBundle(args: {
  proposalId: string;
  choices: string[];
  publishedScores: number[];
  audit: AuditPayload;
  ballots: BallotsPayload;
  ballotResult: BallotAggregateResult;
  tallyResult: VerifyResult;
}): Record<string, any> {
  return {
    format: 'snapshot-permanent-private-vote-audit/v1',
    generatedAt: new Date().toISOString(),
    proposalId: args.proposalId,
    choices: args.choices,
    publishedScores: args.publishedScores,
    threshold: {
      t: args.audit.te_threshold_t,
      n: args.audit.te_threshold_n,
      mpk: args.audit.te_mpk,
      committeePublicKeys: args.audit.te_committee_pks,
      keyperAddresses: args.audit.te_keyper_addresses
    },
    aggregate: args.audit.aggregate,
    decryptionShares: args.audit.shares,
    encryptedBallots: args.ballots.ballots,
    localVerification: {
      ballotsTotal: args.ballotResult.total,
      ballotsAggregated: args.ballotResult.contributing,
      aggregateMatches: args.ballotResult.aggregateMatches,
      // Needed offline to know which ballots were counted.
      exclusions: args.ballotResult.exclusions,
      admittedSetResolved: args.ballotResult.admittedSetResolved,
      publishedTallies: args.tallyResult.tallies.map(t => t.toString()),
      talliesVerified: args.tallyResult.verified,
      failureReason: args.tallyResult.reason,
      derivedBound: args.tallyResult.derivedBound.toString(),
      boundMatchesPublished: args.tallyResult.boundMatchesPublished
    }
  };
}
