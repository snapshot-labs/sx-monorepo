/**
 * Client-side tally audit.
 *
 * Fetches the hub's public bytes — encrypted ballots, the committee aggregate,
 * the decryption shares, the proposal's TE configuration — and re-derives the
 * result from them locally, so an auditor confirms the published scores without
 * trusting the party that published them.
 *
 * Two stages, both independent of the committee:
 *
 *   1. ``aggregateBallots`` re-sums the encrypted ballots (each scaled by its
 *      voting power) and compares the result to the aggregate the keypers signed.
 *      This is the step that ties the tally to ballots actually cast, and it is
 *      also where the client establishes ``derivedBound = budget x Σ(weights it
 *      counted itself)``.
 *
 *   2. ``verifyTally`` verifies every share's DLEQ proof, Lagrange-combines the
 *      quorum subset into a τ per candidate, and checks each published total by
 *      **multiplication**: `total · P₂ == τ`. See that function for why this is
 *      exactly as conclusive as searching for the discrete log, and why the range
 *      and sum checks around it are load-bearing rather than belt-and-braces.
 *
 * **The client never solves the discrete log.** It does not call the SDK's
 * ``recoverTally``, and it deliberately refuses to recover a result the committee
 * has not published: search is O(√bound) in time *and* memory, and this WASM build
 * aborts above bound ~2.5e9 — which a 1,000-voter weighted proposal exceeds. The
 * committee supplies a candidate answer; a wrong one fails with certainty.
 *
 * **What this does not check.** Everything here is in *scaled* units and is
 * self-consistent by construction, so an audit passes whether or not the
 * proposal's `scale` was chosen sensibly. This answers "did the committee tally
 * the ballots honestly?", never "was this proposal configured correctly?" — that
 * belongs to proposal creation (see H12/H13 in the weight-scaling plan).
 *
 * Returned value: the per-candidate integer tallies plus the outcome of each
 * check. Comparison to the proposal's published scores is done by the calling
 * component so the UI can highlight a mismatch in the right place.
 */
import { arrayify } from '@ethersproject/bytes';
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
 * Deterministic short fingerprint of one or more hex strings (e.g. a master
 * public key, or the concatenation of an aggregate's ciphertexts). Used by the
 * UI's "engine-room" inspector so a human can eyeball that two parties refer to
 * the same cryptographic object without printing 96-byte blobs. This is a
 * display aid only. The trust-bearing checks are the ZK/DLEQ verifications.
 */
export function fingerprintHex(parts: string[]): string {
  const joined = parts.map(p => p.replace(/^0x/, '')).join('');
  const digest = keccak256(`0x${joined}`).replace(/^0x/, '');
  return `${digest.slice(0, 8)}…${digest.slice(-8)}`;
}

/** Shorten a long hex string to `0x1234…cdef` for compact display. */
export function shortHex(
  hex: string | undefined | null,
  lead = 6,
  tail = 6
): string {
  if (!hex) return '-';
  const s = hex.startsWith('0x') ? hex : `0x${hex}`;
  if (s.length <= 2 + lead + tail + 1) return s;
  return `${s.slice(0, 2 + lead)}…${s.slice(-tail)}`;
}

export interface AuditPayload {
  te_mpk: string;
  te_config: BallotVerifyParams | null;
  te_committee_pks: string[];
  te_threshold_t: number;
  te_threshold_n: number;
  te_keyper_addresses: string[];
  aggregate: {
    election_id: string;
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
   * The committee's published result, or `null` before one exists.
   *
   * `totals` are decimal **strings**, deliberately: a tally can exceed 2^53, past
   * which a JSON number stops being the integer the keypers decrypted, and the
   * check below is an exact group equality — a value off by one rounding step
   * fails outright rather than nearly passing.
   */
  te_result?: {
    totals: string[];
    keyper_indices: number[];
    bsgs_bound: string;
  } | null;
}

/** One encrypted ballot as served by ``GET /proposal/:id/te_ballots``. */
export interface AuditBallot {
  /** Position in the committee's order; what `admitted`/`exclusions` refer to. */
  sequenceNumber?: number;
  voter: string;
  vp: number;
  choice: {
    electionId: string;
    pseudonym: string;
    vk: string;
    ciphertexts: Array<{ c1: string; c2: string }>;
    zkProof: string;
    voterSignature: string;
    wrAttestation?: string;
  } | null;
}

export interface BallotsPayload {
  te_mpk: string;
  te_config: BallotVerifyParams | null;
  /**
   * The unit this proposal's tally counts in; 1 means no scaling.
   *
   * Applied here exactly as the committee applies it, or the recomputed aggregate
   * will not match and an honest committee is reported as having published a false
   * one.
   */
  scale?: number | null;
  ballots: AuditBallot[];
}

export interface BallotAggregateResult {
  /** Total ballots returned by the hub. */
  total: number;
  /**
   * Ballots that actually contributed weight. Below `total` when a ballot rounds
   * to zero voting power, and zero for an election nobody voted in — which is a
   * legitimate outcome, not a failed audit.
   */
  contributing: number;
  /** Recomputed vp-weighted aggregate equals the published aggregate. */
  aggregateMatches: boolean;
  exclusions: Array<{ sequenceNumber: number; reason: string }>;
  admittedSetResolved: boolean;
  /**
   * Ballots whose weight rounds to zero at this proposal's scale: admitted and
   * recorded, but contributing nothing. Empty unless `scale > 1`, which is itself
   * rare.
   */
  scaledToZero: Array<{ voter: string; vp: number }>;
  /**
   * Σ of the weights this client actually counted.
   *
   * Derived here rather than read from the committee's artifact on purpose: it is
   * what bounds the published totals, and a bound taken from the same party whose
   * totals are being checked would check nothing.
   */
  totalWeight: bigint;
}

/**
 * Compressed encoding of the G2 point at infinity: the compression and infinity
 * bits set, then zeros. It is what a sum over no ciphertexts equals, and what the
 * keypers publish for every candidate in an election with no admitted ballots.
 */
const IDENTITY_G2 = `0x${'c0'.padEnd(192, '0')}`;

export interface VerifyResult {
  /** The committee's published per-candidate totals, as exact integers. */
  tallies: bigint[];
  /** Whether those totals verify against the aggregate and the decryption shares. */
  verified: boolean;
  /** Why they did not, when `verified` is false; `null` otherwise. */
  reason: string | null;
  shareCount: number;
  thresholdMet: boolean;
  /** `budget × Σ(counted weights)`, derived from the ballots this client read. */
  derivedBound: bigint;
  /**
   * Whether the committee's published `bsgs_bound` equals the locally derived one.
   * Advisory: the equality check above already establishes the totals. A mismatch
   * narrows a discrepancy to "published against a different admitted set" instead
   * of leaving it as a bare disagreement. `null` when no result is published.
   */
  boundMatchesPublished: boolean | null;
}

/**
 * Pull the public audit payload from the hub. The base URL must end at
 * the ``/api`` prefix (i.e. the same prefix the sequencer's vote ingest
 * uses); the function appends the proposal-specific path.
 */
export async function fetchAuditPayload(
  apiBaseUrl: string,
  proposalId: string
): Promise<AuditPayload> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/proposal/${encodeURIComponent(
    proposalId
  )}/te_decryption_shares`;
  const r = await fetch(url, { credentials: 'omit' });
  if (!r.ok) throw new Error(`hub ${r.status}: ${await r.text()}`);
  return (await r.json()) as AuditPayload;
}

/**
 * Pull every individual encrypted ballot (+ the voting power it was
 * counted with) from the hub. Same ``/api`` base-URL convention as
 * ``fetchAuditPayload``.
 */
export async function fetchBallotsPayload(
  apiBaseUrl: string,
  proposalId: string
): Promise<BallotsPayload> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/proposal/${encodeURIComponent(
    proposalId
  )}/te_ballots`;
  const r = await fetch(url, { credentials: 'omit' });
  if (!r.ok) throw new Error(`hub ${r.status}: ${await r.text()}`);
  return (await r.json()) as BallotsPayload;
}

function ctToHex(ct: Ciphertext): { c1: string; c2: string } {
  const toHex = (b: Uint8Array) =>
    `0x${Array.from(b)
      .map(x => x.toString(16).padStart(2, '0'))
      .join('')}`;
  return { c1: toHex(ct.c1.toBytes()), c2: toHex(ct.c2.toBytes()) };
}

/**
 * Trustless-audit step 1: re-aggregate the encrypted ballots and confirm
 * the result matches what the keypers decrypted.
 *
 * Deliberately does NOT re-run each ballot's zero-knowledge proof or
 * pseudonym binding here: the sequencer already ran that exact check
 * (``verifyBallot``, via ``verifyTeBallot`` in
 * apps/sequencer/src/helpers/te.ts) at cast time, before the ballot was
 * ever persisted -- see apps/sequencer/src/writer/vote.ts's ``verify()``.
 * Repeating it client-side, per ballot, is redundant with that gate and,
 * at real proposal sizes, is what made this step freeze the page (each
 * proof verification is several seconds of BLST pairing work). What this
 * step *can't* skip is the aggregation + comparison: that's the part that
 * actually catches a hub/sequencer lying about the published aggregate.
 *
 * For every ballot returned by the hub, this homomorphically accumulates
 * its ciphertexts into a running total (scaled by voting power, the exact
 * weighting the sequencer applied in ``aggregateBallots``), then compares
 * the result to ``expectedAggregate`` byte-for-byte.
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
   * Ballots weighted per multi-scalar multiplication rather than one scalar
   * multiplication each — the difference between roughly 6 ms per ballot per
   * candidate and a fraction of that (see the SDK's `crypto/msm.ts`).
   *
   * Chunked because the whole point set for a chunk has to be resident at once,
   * and the WASM heap is a fixed 16 MB. At 256 ballots the live set peaks at
   * `256 x candidates x 2` points — about 2.9 MB even at the 20-candidate maximum,
   * which leaves the bucket table and everything else comfortable. Summing chunk
   * partials is exact: addition is associative, so the total is byte-identical to
   * weighting and adding every ballot in one pass.
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
        // Without a sequence number there is nothing to match against, so the
        // ballot cannot be shown to be one the committee counted.
        if (typeof b.sequenceNumber !== 'number') continue;
        if (!admitted.has(b.sequenceNumber)) continue;
      }

      const raw = BigInt(Math.round(b.vp));
      // Integer half-up, byte-matching geg's `(w + s//2) // s`. `Math.round(w/s)`
      // would agree in JavaScript and disagree in Python at exactly `.5`.
      const w = scale > 1n ? (raw + scale / 2n) / scale : raw;
      if (raw > 0n && w === 0n) {
        // Admitted, recorded, and worth nothing at this scale — reported so the
        // audit panel can say so rather than leaving it to look like an omission.
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

    // Compare the recomputed aggregate to the published one byte-for-byte.
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
 * Why there is no verified tally yet — worked out from public data, not read.
 *
 * The split that decides what an operator does is **derived, not trusted**: share
 * counts and the presence of a result are public and unforgeable by whoever serves
 * them, because the shares carry DLEQ proofs and the result has to satisfy an
 * equality this client checks itself.
 *
 *   - `awaiting-shares`      — the committee has not produced a quorum. A keyper
 *                              availability problem; chasing the coordinator will
 *                              not help.
 *   - `awaiting-coordinator` — the shares are all there and no result has been
 *                              published. The coordinator's problem.
 *
 * The coordinator's own `tallyStallReason` refines the second case only, and is
 * unsigned — render it as a claim ("the coordinator reports…"), never as fact. It
 * cannot make an unverifiable tally look verifiable, so an unauthenticated hint is
 * an acceptable trade here; that stops being true the moment it gates an automated
 * action rather than a human's attention.
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
    if (s.candidate >= 0 && s.candidate < numCandidates)
      perCandidate[s.candidate]++;
  }
  const candidatesShort = perCandidate.filter(n => n < need).length;
  if (candidatesShort > 0)
    return { kind: 'awaiting-shares', candidatesShort, need };

  const totals = payload.te_result?.totals;
  if (!totals || totals.length === 0) return { kind: 'awaiting-coordinator' };
  return { kind: 'published' };
}

/**
 * Trustless-audit step 2: check the committee's published totals against the
 * aggregate and the decryption shares.
 *
 * **Checked, not re-solved.** Every share's DLEQ is verified here, the quorum
 * subset is Lagrange-combined here, and each published total is multiplied by the
 * generator and compared to the τ this client derived itself. That is exactly as
 * conclusive as searching for the discrete log — it is unique, so only the true
 * total satisfies the equality — and it is the difference between ~6 ms per
 * candidate and a baby-step table this WASM build cannot allocate: `recoverTally`
 * aborts outright somewhere above bound 2.5e9, which a 1,000-voter weighted
 * proposal reaches. The only thing taken from the committee is a candidate answer,
 * and a wrong one fails with certainty.
 *
 * ``derivedBound`` must be `budget × Σ(weights this client counted)` — from
 * ``aggregateBallots``, never from the committee's own artifact. It range-checks
 * the totals, which is what stops a published `T + q` (the same group element as
 * `T`) passing the equality as a nonsense 256-bit integer.
 *
 * Throws synchronously on shape mismatches (missing aggregate, malformed hex).
 * A tally that simply fails to verify is *not* an exception: it comes back as
 * ``verified: false`` with a reason, so the UI can say which check failed.
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

  // Group shares per candidate (0-indexed). Each share's DLEQ bytes
  // are the concatenation of proof_e || proof_z (32+32). The SDK
  // ``decodeDLEQ`` accepts that exact layout.
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
  const thresholdMet = sharesPerCandidate.every(
    arr => arr.length >= te_threshold_t
  );

  try {
    if (!thresholdMet) {
      throw new Error(
        `not enough decryption shares per candidate (need t=${te_threshold_t})`
      );
    }

    const electionIdBytes = arrayify(proposalId);
    const published = payload.te_result;
    if (!published || published.totals.length === 0) {
      // Nothing to check against. Deliberately not an occasion to solve it here:
      // recovering a withheld result is an escalation someone chooses, on a machine
      // sized for it, not something a browser tab does on a page load.
      throw new Error(
        'The committee has not published a result for this proposal yet, so there ' +
          'is nothing to verify against.'
      );
    }

    // Exact integers, parsed from decimal strings. Anything that has been through a
    // float is not the number the keypers decrypted once a tally passes 2^53.
    const tallies = published.totals.map(t => BigInt(t));

    const { ok, reason } = verifyTallyAgainstTotals({
      ctSums,
      sharesPerCandidate,
      // SDK boundary: it takes the fault count and combines one more share.
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

    // Advisory only — the equality above already establishes the totals. This just
    // turns "something disagrees" into "they tallied a different admitted set".
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
      shareCount: shares.length,
      thresholdMet,
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
  /** Derived locally from the ballots — never taken from the committee. */
  derivedBound: bigint;
}

/**
 * Both halves of an audit, in one call: recompute the aggregate from the raw
 * ballots, then check the committee's published totals against it.
 *
 * Exists as a single function so the Web Worker entry point can be a thin
 * wrapper around it (`teVerifyWorker.ts`). Everything here is pure computation
 * over already-fetched payloads — no network, no DOM — which is what makes it
 * both worker-safe and testable in node.
 *
 * `onProgress` is called between chunks. The aggregate phase dominates by a wide
 * margin: at the time of writing each ciphertext costs ~2.8 ms to decompress
 * (the subgroup check inside `G2Point.fromBytes`), so a 1,000-ballot 5-choice
 * proposal spends ~28 s there against ~3 s on the weighted sum and ~2 s on the
 * tally check. That is precisely why this runs off the main thread.
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

  // The bound comes from the ballots this client just counted, never from the
  // committee's own artifact — a bound supplied by the party whose totals are
  // being checked would check nothing.
  const derivedBound = ballots.totalWeight * BigInt(budget);

  onProgress?.({ phase: 'tally', done: 0, total: 1 });
  const tally = await verifyTally(proposalId, payload, derivedBound);
  onProgress?.({ phase: 'tally', done: 1, total: 1 });

  return { ballots, tally, derivedBound };
}

/**
 * Assemble a self-contained verification bundle that a third party can
 * re-verify offline (e.g. with the SDK's CLI) without trusting this UI or the
 * hub. It contains the public audit payload (aggregate + decryption shares +
 * committee keys), every encrypted ballot with its zero-knowledge proof, and
 * the results this client computed locally. No secrets are present, only the
 * public bytes anyone can already fetch from the hub.
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
      // Recorded in the bundle too: a reader reproducing this offline has to
      // know which ballots were in scope, or they will recompute over all of
      // them and reach a different answer for a correct election.
      exclusions: args.ballotResult.exclusions,
      admittedSetResolved: args.ballotResult.admittedSetResolved,
      publishedTallies: args.tallyResult.tallies.map(t => t.toString()),
      thresholdMet: args.tallyResult.thresholdMet,
      talliesVerified: args.tallyResult.verified,
      failureReason: args.tallyResult.reason,
      derivedBound: args.tallyResult.derivedBound.toString(),
      boundMatchesPublished: args.tallyResult.boundMatchesPublished
    }
  };
}
