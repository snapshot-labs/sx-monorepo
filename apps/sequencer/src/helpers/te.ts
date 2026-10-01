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
 * Pseudonym: ``keccak256(voter_address || proposal_id)``. Voter and the
 * sequencer agree on this construction; the sequencer recomputes it and
 * rejects any ballot that ships a different one (so a voter cannot
 * mis-link their ballot to someone else's proposal).
 */

import { arrayify } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/keccak256';
import {
  BallotInputs,
  BallotVerifyParams,
  G2Point,
  initCurves,
  verifyBallot,
  VerifyResult
} from '@shutter-network/urban-verified-crypto';

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
  choiceJsonString: string,
  /** Compressed G1 of the eligibility issuer — the SDK verifies the credential now. */
  eligibilityKey: string
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

  // The credential is required, and structured: it is part of what the voter signed,
  // so a ballot without one cannot have a valid signature either. Refusing here names
  // the cause instead of surfacing it as a signature failure.
  const att = (envelope as any).attestation;
  if (!att || typeof att !== 'object') {
    return { ok: false, reason: 'ballot_carries_no_credential' };
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
      attestation: {
        electionId: hexToBytes(att.electionId, 'attestation.electionId'),
        pseudonym: hexToBytes(att.pseudonym, 'attestation.pseudonym'),
        vk: hexToBytes(att.vk, 'attestation.vk'),
        weight: BigInt(att.weight),
        nonce: BigInt(att.nonce),
        signature: hexToBytes(att.signature, 'attestation.signature')
      }
    };
    await ensureCurvesInit();
    mpk = G2Point.fromBytes(hexToBytes(proposal.te_mpk, 'te_mpk'));
  } catch (err: any) {
    return { ok: false, reason: `bad_envelope: ${err?.message || err}` };
  }

  // The SDK verifies the credential itself now, against the issuer's key — the
  // caller-supplied predicate is gone, and with it the `() => true` that stood in
  // for it while the slot was opaque bytes with no room for weight or nonce.
  try {
    return verifyBallot(
      inputs,
      proposal.te_config,
      mpk,
      hexToBytes(eligibilityKey, 'eligibilityKey')
    );
  } finally {
    mpk.destroyWasm();
  }
}

/**
 * A private ballot is counted by scaling its ciphertexts by an **integer**
 * weight — the protocol has no representation for a fractional one — so the hub
 * emits each ballot at `round(vp)` and skips anything that rounds to zero.
 * Voting power below 0.5 therefore contributes nothing to a private tally, where
 * the same figure would count normally on a public proposal.
 * Refusing such a vote at ingest is better than accepting one the tally will
 * drop.
 */
export function isDustVotingPower(vp: number): boolean {
  return !Number.isFinite(vp) || Math.round(vp) < 1;
}

export function isWithinGegVotingWindow(
  t: number,
  votingStart: number,
  votingEnd: number
): boolean {
  return votingStart <= t && t < votingEnd;
}
