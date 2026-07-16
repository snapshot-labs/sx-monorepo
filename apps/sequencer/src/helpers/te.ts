/**
 * Threshold-ElGamal vote-ingestion helpers.
 *
 * Validates a permanent-private (privacy='shutter-elgamal') ballot at
 * write time so we never persist a ciphertext that a later tally would
 * reject. The hub stores `proposal.choice` as the same JSON envelope the
 * voter submitted; this module decodes it into the SDK's
 * ``BallotInputs`` shape and runs ``verifyBallot`` against the
 * proposal's master public key.
 *
 * Auth model: the EIP-712 outer signature on the vote message is
 * Snapshot's existing voter-authentication boundary. The SDK's
 * ``WRAttestationVerifier`` slot is therefore satisfied with a constant
 * ``() => true`` here — the registration check happens earlier in the
 * pipeline, not on the SDK's wrAttestation field.
 *
 * Pseudonym: ``keccak256(voter_address || proposal_id)``. Voter and the
 * sequencer agree on this construction; the sequencer recomputes it and
 * rejects any ballot that ships a different one (so a voter cannot
 * mis-link their ballot to someone else's proposal).
 */

import { arrayify } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/keccak256';
import {
  addCt,
  BallotInputs,
  BallotVerifyParams,
  Ciphertext,
  decodeDLEQ,
  G2Point,
  initCurves,
  PartialDecryption,
  recoverTally,
  scalarMulCt,
  Transcript,
  verifyBallot,
  VerifyResult
} from '@snapshot-labs/private-vote-sdk';

let curvesReady: Promise<void> | null = null;

export function ensureCurvesInit(): Promise<void> {
  if (!curvesReady) curvesReady = initCurves();
  return curvesReady;
}

/** Wire envelope the voter sends as ``msg.payload.choice`` (a JSON string). */
export interface TeBallotEnvelope {
  electionId: string; // 0x-hex bytes32
  pseudonym: string; // 0x-hex bytes32
  vk: string; // 0x-hex 48-byte compressed G1 (voter Schnorr verification key)
  ciphertexts: Array<{ c1: string; c2: string }>; // each 0x-hex 96-byte compressed G2
  zkProof: string; // 0x-hex output of encodeBallotValidityProof
  voterSignature: string; // 0x-hex 80-byte encoded Schnorr sig
  wrAttestation?: string; // 0x-hex; not used by the snapshot ingest path
}

function hexToBytes(hex: string, label: string): Uint8Array {
  if (typeof hex !== 'string' || !/^0x[0-9a-fA-F]*$/.test(hex)) {
    throw new Error(`${label}: not a 0x hex string`);
  }
  if (hex.length % 2 !== 0) {
    throw new Error(`${label}: odd-length hex`);
  }
  return arrayify(hex);
}

export function expectedPseudonym(voter: string, proposalId: string): string {
  const voterBytes = arrayify(voter.toLowerCase());
  // proposalId in Snapshot is a 0x-prefixed bytes32-shaped string; we hash
  // its raw bytes after stripping the prefix. If a future proposal id
  // shape changes, the keyper-side tally code does the same construction.
  const idBytes = arrayify(proposalId);
  const buf = new Uint8Array(voterBytes.length + idBytes.length);
  buf.set(voterBytes, 0);
  buf.set(idBytes, voterBytes.length);
  return keccak256(buf);
}

export interface TeProposalView {
  id: string;
  te_config: BallotVerifyParams | null;
  te_mpk: string | null; // 0x-hex compressed G2 (96 bytes)
}

export async function verifyTeBallot(
  proposal: TeProposalView,
  voter: string,
  choiceJsonString: string
): Promise<VerifyResult> {
  if (!proposal.te_config) {
    return { ok: false, reason: 'proposal_missing_te_config' };
  }
  if (!proposal.te_mpk) {
    return { ok: false, reason: 'proposal_dkg_not_finalized' };
  }

  let envelope: TeBallotEnvelope;
  try {
    const raw = JSON.parse(choiceJsonString);
    if (!raw || typeof raw !== 'object') throw new Error('not object');
    envelope = raw as TeBallotEnvelope;
  } catch {
    return { ok: false, reason: 'choice_not_json_envelope' };
  }

  // Pseudonym must equal keccak256(voter || proposalId). A mismatch is
  // either a malformed client or someone trying to attribute a ballot to
  // a different proposal — reject before doing the (expensive) zk verify.
  const expected = expectedPseudonym(voter, proposal.id);
  if (
    typeof envelope.pseudonym !== 'string' ||
    envelope.pseudonym.toLowerCase() !== expected.toLowerCase()
  ) {
    return { ok: false, reason: 'pseudonym_mismatch' };
  }

  let inputs: BallotInputs;
  let mpk: G2Point;
  try {
    inputs = {
      electionId: hexToBytes(envelope.electionId, 'electionId'),
      pseudonym: hexToBytes(envelope.pseudonym, 'pseudonym'),
      vk: hexToBytes(envelope.vk, 'vk'),
      ciphertexts: (envelope.ciphertexts || []).map(
        (c, i) =>
          [
            hexToBytes(c.c1, `ciphertexts[${i}].c1`),
            hexToBytes(c.c2, `ciphertexts[${i}].c2`)
          ] as [Uint8Array, Uint8Array]
      ),
      zkProof: hexToBytes(envelope.zkProof, 'zkProof'),
      voterSignature: hexToBytes(envelope.voterSignature, 'voterSignature'),
      wrAttestation: hexToBytes(envelope.wrAttestation || '0x', 'wrAttestation')
    };
    await ensureCurvesInit();
    mpk = G2Point.fromBytes(hexToBytes(proposal.te_mpk, 'te_mpk'));
  } catch (err: any) {
    return { ok: false, reason: `bad_envelope: ${err?.message || err}` };
  }

  // wrAttestation is satisfied by Snapshot's outer EIP-712 envelope, so
  // the SDK-level WR verifier is a constant ``() => true``. See module
  // docstring for the full auth-boundary argument.
  try {
    return verifyBallot(inputs, proposal.te_config, mpk, () => true);
  } finally {
    mpk.destroyWasm();
  }
}

// ---------- Phase 4: tally aggregation + recovery ----------

const DECRYPT_TRANSCRIPT_LABEL = 'SHUTTER-VOTE-DECRYPT-v1';

function u16BE(n: number): Uint8Array {
  const out = new Uint8Array(2);
  out[0] = (n >>> 8) & 0xff;
  out[1] = n & 0xff;
  return out;
}

/**
 * Decode the per-candidate ciphertexts out of a stored ballot envelope.
 * The envelope shape is the same one ``verifyTeBallot`` accepts; we trust
 * it here because tally only runs over already-verified rows.
 */
export function envelopeCiphertexts(choiceJsonString: string): Ciphertext[] {
  const env = JSON.parse(choiceJsonString) as TeBallotEnvelope;
  return (env.ciphertexts || []).map((c, i) => ({
    c1: G2Point.fromBytes(hexToBytes(c.c1, `ciphertexts[${i}].c1`)),
    c2: G2Point.fromBytes(hexToBytes(c.c2, `ciphertexts[${i}].c2`))
  }));
}

/**
 * Voting-power-weighted homomorphic sum across all submitted ballots,
 * one ciphertext per candidate. ``vp`` is taken as a non-negative
 * integer; fractional vp would break the integer-tally semantics that
 * BSGS recovers (Variant A only emits {0,1} per candidate, but vp
 * scales each ballot before the sum).
 */
export function aggregateBallots(
  numCandidates: number,
  votes: ReadonlyArray<{ choice: any; vp: number }>
): Ciphertext[] {
  if (votes.length === 0) {
    throw new Error('aggregateBallots: no votes to aggregate');
  }

  // WASM heap management: BLST compiles to a fixed 16 MB WASM heap. G₂ points
  // live there and are only freed when the JS GC fires the FinalizationRegistry
  // callback — timing is non-deterministic. scalarMulCt and addCt each allocate
  // a fresh pair of G₂ points; without explicit cleanup the intermediate points
  // from every ballot accumulate until GC runs. At ~8 KB per ballot (10
  // candidates × 2 points × ~400 B each) that exhausts the heap after ~2 000
  // ballots if GC doesn't fire in time.
  //
  // Fix: call destroyWasm() on every point we no longer need immediately after
  // it is superseded. This keeps heap usage at O(numCandidates) — just the
  // running accumulators — regardless of voter count.
  const acc: (Ciphertext | null)[] = new Array(numCandidates).fill(null);
  for (const vote of votes) {
    const choiceJson =
      typeof vote.choice === 'string'
        ? vote.choice
        : JSON.stringify(vote.choice);
    const cts = envelopeCiphertexts(choiceJson);
    if (cts.length !== numCandidates) {
      throw new Error(
        `aggregateBallots: ciphertext count ${cts.length} != ${numCandidates}`
      );
    }
    const w = BigInt(Math.round(vote.vp));
    if (w < 0n) throw new Error('aggregateBallots: negative vp');
    if (w === 0n) {
      for (const ct of cts) {
        ct.c1.destroyWasm();
        ct.c2.destroyWasm();
      }
      continue;
    }

    for (let j = 0; j < numCandidates; j++) {
      const raw = cts[j];
      // w === 1n: reuse raw directly (no new allocation).
      // w  >  1n: scalarMulCt allocates a new ciphertext; raw is now stale.
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
        // Both inputs to addCt are superseded by the new sum — free them.
        prev.c1.destroyWasm();
        prev.c2.destroyWasm();
        weighted.c1.destroyWasm();
        weighted.c2.destroyWasm();
      }
    }
  }

  for (let j = 0; j < numCandidates; j++) {
    if (acc[j] === null) {
      throw new Error(
        `aggregateBallots: no positive-weight votes for candidate ${j}`
      );
    }
  }
  return acc as Ciphertext[];
}

/** Aggregate JSON shape persisted in ``proposals.te_aggregate``. */
export interface TeAggregateJson {
  election_id: string; // 0x-hex (proposal id)
  num_candidates: number;
  ciphertexts: Array<{ c1: string; c2: string }>;
}

export function aggregateToJson(
  proposalId: string,
  ciphertexts: Ciphertext[]
): TeAggregateJson {
  return {
    election_id: proposalId,
    num_candidates: ciphertexts.length,
    ciphertexts: ciphertexts.map(ct => ({
      c1: `0x${Buffer.from(ct.c1.toBytes()).toString('hex')}`,
      c2: `0x${Buffer.from(ct.c2.toBytes()).toString('hex')}`
    }))
  };
}

/**
 * Recover per-candidate integer tallies from verified shares.
 *
 * ``shares`` is indexed ``[candidateIndex][shareIndex]``. Each share
 * carries its own keyperIndex; ``recoverTally`` Lagrange-interpolates
 * any t+1 of them. The transcript factory mirrors the Python keyper's
 * ``make_onchain_decrypt_transcript`` exactly: label
 * ``SHUTTER-VOTE-DECRYPT-v1``, then ``electionId`` (32 bytes from the
 * proposal id), then ``candidate`` (u16 BE).
 */
export async function recoverTeTally(
  proposalId: string,
  ctSums: Ciphertext[],
  shares: PartialDecryption[][],
  threshold: number,
  committeePKs: G2Point[],
  upperBound: bigint
): Promise<bigint[]> {
  await ensureCurvesInit();
  const electionIdBytes = arrayify(proposalId);
  return recoverTally({
    ctSums,
    sharesPerCandidate: shares,
    threshold,
    committeePKs,
    upperBound,
    transcriptFor: (j: number) => {
      const t = new Transcript(DECRYPT_TRANSCRIPT_LABEL);
      t.append('electionId', electionIdBytes);
      t.append('candidate', u16BE(j));
      return t;
    }
  });
}

/**
 * Build a ``PartialDecryption[][]`` (per-candidate) from raw DB rows of
 * ``te_decryption_shares``. Each row supplies its sigma + (proof_e, proof_z)
 * as raw bytes; we wrap them into the SDK's in-memory ``DLEQProof`` shape
 * via ``decodeDLEQ`` of the concatenated 64 bytes.
 *
 * ``ctSums.length`` defines the candidate axis; rows whose ``candidate``
 * is out of range are dropped (with a returned warning) rather than
 * letting the tally fail mid-recover.
 */
export function shareRowsToShares(
  rows: ReadonlyArray<{
    keyper_index: number;
    candidate: number;
    sigma: Buffer | Uint8Array;
    proof_e: Buffer | Uint8Array;
    proof_z: Buffer | Uint8Array;
  }>,
  numCandidates: number
): { shares: PartialDecryption[][]; warnings: string[] } {
  const warnings: string[] = [];
  const shares: PartialDecryption[][] = Array.from(
    { length: numCandidates },
    () => []
  );
  for (const r of rows) {
    if (r.candidate < 0 || r.candidate >= numCandidates) {
      warnings.push(
        `share keyper=${r.keyper_index} candidate=${r.candidate} out of range`
      );
      continue;
    }
    const sigma = G2Point.fromBytes(new Uint8Array(r.sigma));
    const proofBytes = new Uint8Array(64);
    proofBytes.set(new Uint8Array(r.proof_e), 0);
    proofBytes.set(new Uint8Array(r.proof_z), 32);
    const proof = decodeDLEQ(proofBytes);
    shares[r.candidate].push({
      keyperIndex: r.keyper_index,
      sigma,
      proof
    });
  }
  return { shares, warnings };
}

/**
 * Fire-and-forget keyper trigger. POSTs the proposal id to each keyper's
 * ``/decrypt/publish_on_chain`` endpoint; the keyper pulls the aggregate
 * from the hub and POSTs back its share. We do not await the responses
 * because the hub-side share row is the success signal we actually care
 * about; this just nudges the keypers to run.
 */
export async function triggerKeypers(
  proposalId: string,
  keyperUrls: string[]
): Promise<void> {
  await Promise.all(
    keyperUrls.map(async url => {
      const target = `${url.replace(/\/$/, '')}/decrypt/publish_on_chain`;
      try {
        await fetch(target, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ proposal_id: proposalId })
        });
      } catch {
        // Swallow: the next tally tick re-triggers, and missing shares
        // remain visible via the share-row count gate.
      }
    })
  );
}

/**
 * Decode the 0x-hex committee pks list (Phase 1 ``te_committee_pks``
 * column) into G2Point[] in the keyper-index order. ``committee_pks[k-1]``
 * is keyper k's public key.
 */
export function decodeCommitteePks(committeePks: string[]): G2Point[] {
  return committeePks.map((hex, i) =>
    G2Point.fromBytes(hexToBytes(hex, `committee_pks[${i}]`))
  );
}
