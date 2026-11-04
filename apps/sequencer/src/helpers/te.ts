/**
 * Validation of private (`privacy = 'shutter-elgamal'`) ballots at ingest, so no
 * ballot is stored that the tally would reject. The vote's `choice` is the JSON
 * ballot envelope; it is decoded into the SDK's `BallotInputs` and checked with
 * `verifyBallot` against the proposal's master public key.
 */

import { arrayify } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/keccak256';
import {
  BallotInputs,
  BallotVerifyParams,
  G2Point,
  initCurves,
  VerifyResult
} from '@shutter-network/urban-verified-crypto';
import { verifyBallotInWorker } from './teBallotPool';

let curvesReady: Promise<void> | null = null;

export function ensureCurvesInit(): Promise<void> {
  if (!curvesReady) curvesReady = initCurves();
  return curvesReady;
}

/** The ballot envelope the voter sends as `msg.payload.choice` (a JSON string). */
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

/**
 * keccak256(voter address ‖ proposal id). Ballots with any other pseudonym are
 * rejected.
 */
export function expectedPseudonym(voter: string, proposalId: string): string {
  const voterBytes = arrayify(voter.toLowerCase());
  // The proposal id is 0x-hex; its raw bytes are hashed.
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
  /** Compressed G1 key of the credential issuer; the SDK checks the credential with it. */
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

  // vote.ts has already refused a ballot without a credential.
  const att = (envelope as any).attestation;

  // Checked before the expensive proof verification.
  const expected = expectedPseudonym(voter, proposal.id);
  if (
    typeof envelope.pseudonym !== 'string' ||
    envelope.pseudonym.toLowerCase() !== expected.toLowerCase()
  ) {
    return { ok: false, reason: 'pseudonym_mismatch' };
  }

  let inputs: BallotInputs;
  let mpk: Uint8Array;
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
    mpk = hexToBytes(proposal.te_mpk, 'te_mpk');
    // Decoded here rather than in the worker, so a key that is not a curve point
    // is still reported as a bad envelope.
    await ensureCurvesInit();
    G2Point.fromBytes(mpk).destroyWasm();
  } catch (err: any) {
    return { ok: false, reason: `bad_envelope: ${err?.message || err}` };
  }

  // The SDK also verifies the credential against the issuer's key. Runs in a
  // worker thread because it takes seconds of CPU per ballot.
  const job = {
    inputs,
    params: proposal.te_config,
    mpk,
    eligibilityKey: hexToBytes(eligibilityKey, 'eligibilityKey')
  };
  try {
    return await verifyBallotInWorker(job);
  } catch {
    // A worker crashed or could not start; the pool has logged why. Answered as a
    // result, so the voter gets a message instead of an empty error.
    return { ok: false, reason: 'verifier_unavailable' };
  }
}

/**
 * Private ballots are weighted by `round(vp)`, since the protocol only supports
 * integer weights, and a weight of 0 is dropped from the tally. So voting power
 * below 0.5 is refused instead of being accepted and then not counted.
 */
export function isDustVotingPower(vp: number): boolean {
  return !Number.isFinite(vp) || Math.round(vp) < 1;
}

export function isWithinSgpVotingWindow(
  t: number,
  votingStart: number,
  votingEnd: number
): boolean {
  return votingStart <= t && t < votingEnd;
}
