/**
 * Phase 8. Client-side tally audit.
 *
 * Calls the hub's public GET endpoint for decryption shares + the
 * proposal's TE configuration, then runs the SDK's ``recoverTally``
 * locally so that any auditor can independently confirm the published
 * scores. Every share's DLEQ proof is verified inside ``recoverTally``;
 * the wrapper here is essentially "fetch the public bytes and feed
 * them to the SDK in the same shape the sequencer used".
 *
 * Returned value: the per-candidate integer tallies. Comparison to the
 * proposal's published scores is done by the calling component so that
 * the UI can highlight any mismatch in the right place.
 */
import { arrayify } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/keccak256';
import {
  addCt,
  BallotVerifyParams,
  Ciphertext,
  decodeDLEQ,
  G2Point,
  PartialDecryption,
  recoverTally,
  scalarMulCt,
  Transcript
} from '@snapshot-labs/private-vote-sdk';
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
  };
  shares: Array<{
    keyper_index: number;
    candidate: number;
    sigma: string;
    proof_e: string;
    proof_z: string;
  }>;
}

/** One encrypted ballot as served by ``GET /proposal/:id/te_ballots``. */
export interface AuditBallot {
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
  ballots: AuditBallot[];
}

export interface BallotAggregateResult {
  /** Total ballots returned by the hub. */
  total: number;
  /** Recomputed vp-weighted aggregate equals the published aggregate. */
  aggregateMatches: boolean;
}

export interface VerifyResult {
  tallies: bigint[];
  matchesPublished: boolean | null;
  shareCount: number;
  thresholdMet: boolean;
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
  expectedAggregate: AuditPayload['aggregate']
): Promise<BallotAggregateResult> {
  await ensureCurvesInit();

  if (!expectedAggregate) {
    throw new Error('No published aggregate to compare the ballots against');
  }
  const numCandidates = expectedAggregate.num_candidates;
  const acc: (Ciphertext | null)[] = new Array(numCandidates).fill(null);

  try {
    for (const b of payload.ballots) {
      const env = b.choice;
      if (!env) continue;

      const w = BigInt(Math.round(b.vp));
      if (w <= 0n) continue;

      const cts: Ciphertext[] = env.ciphertexts.map(c => ({
        c1: G2Point.fromBytes(arrayify(c.c1)),
        c2: G2Point.fromBytes(arrayify(c.c2))
      }));
      for (let j = 0; j < numCandidates; j++) {
        const raw = cts[j];
        const weighted = w === 1n ? raw : scalarMulCt(w, raw);
        if (w !== 1n) {
          raw.c1.destroyWasm();
          raw.c2.destroyWasm();
        }
        if (acc[j] === null) {
          acc[j] = weighted;
        } else {
          const prev = acc[j]!;
          acc[j] = addCt(prev, weighted);
          prev.c1.destroyWasm();
          prev.c2.destroyWasm();
          weighted.c1.destroyWasm();
          weighted.c2.destroyWasm();
        }
      }
    }

    // Compare the recomputed aggregate to the published one byte-for-byte.
    let aggregateMatches = true;
    for (let j = 0; j < numCandidates; j++) {
      if (acc[j] === null) {
        aggregateMatches = false;
        break;
      }
      const got = ctToHex(acc[j]!);
      const want = expectedAggregate.ciphertexts[j];
      if (
        got.c1.toLowerCase() !== want.c1.toLowerCase() ||
        got.c2.toLowerCase() !== want.c2.toLowerCase()
      ) {
        aggregateMatches = false;
        break;
      }
    }

    return { total: payload.ballots.length, aggregateMatches };
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
 * Trustless-audit step 2: recover the tally from the public decryption
 * shares and (optionally) compare it to the published scores.
 *
 * Throws synchronously on shape mismatches (missing aggregate, fewer
 * than ``t+1`` shares for some candidate, malformed hex). Otherwise
 * returns the recovered tallies and an optional comparison flag if
 * ``publishedScores`` is supplied.
 */
export async function verifyTally(
  proposalId: string,
  payload: AuditPayload,
  publishedScores?: number[],
  budget = 1
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
  const thresholdMet = sharesPerCandidate.every(
    arr => arr.length >= te_threshold_t + 1
  );

  try {
    if (!thresholdMet) {
      throw new Error(
        `not enough decryption shares per candidate (need t+1=${te_threshold_t + 1})`
      );
    }

    const electionIdBytes = arrayify(proposalId);
    // Published scores are divided by budget (e.g. 0.6, 0.4 for a 60/40 weighted
    // split). Scale them back to raw integers for BSGS upper bound and comparison.
    const rawPublished = (publishedScores || []).map(s =>
      BigInt(Math.round(s * budget))
    );
    const sumPublished = rawPublished.reduce((s, n) => s + n, 0n);
    // Upper bound for BSGS: actual sum of published scores + 1.
    // When sumPublished = 0 (zero-vote election), upperBound = 1 and the
    // baby-step table has a single entry (the identity), so the lookup is
    // trivial. The caller must ensure scores are final before calling this
    // function; verifying against unfinalised (all-zero) scores is meaningless.
    const upperBound = sumPublished + 1n;

    const tallies = recoverTally({
      ctSums,
      sharesPerCandidate,
      threshold: te_threshold_t,
      committeePKs,
      upperBound,
      transcriptFor: (j: number) => {
        const t = new Transcript(DECRYPT_TRANSCRIPT_LABEL);
        t.append('electionId', electionIdBytes);
        t.append('candidate', u16BE(j));
        return t;
      }
    });

    let matchesPublished: boolean | null = null;
    if (publishedScores && rawPublished.length > 0) {
      matchesPublished =
        rawPublished.length === tallies.length &&
        tallies.every((v, i) => v === rawPublished[i]);
    }

    return {
      tallies,
      matchesPublished,
      shareCount: shares.length,
      thresholdMet
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
      aggregateMatches: args.ballotResult.aggregateMatches,
      recoveredTallies: args.tallyResult.tallies.map(t => t.toString()),
      thresholdMet: args.tallyResult.thresholdMet,
      matchesPublishedScores: args.tallyResult.matchesPublished
    }
  };
}
