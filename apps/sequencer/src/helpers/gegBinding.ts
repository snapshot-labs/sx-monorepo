import { arrayify } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/keccak256';
import {
  canonicalBallotMessage,
  G1Point,
  schnorrVerify
} from '@shutter-network/urban-verified-crypto';
import { GegAttestationError } from './gegAttestation';
import { ensureCurvesInit } from './te';

export function hexToBytes(
  hex: string,
  label: string,
  size?: number
): Uint8Array {
  const body =
    typeof hex === 'string' && hex.startsWith('0x') ? hex.slice(2) : hex;
  if (
    typeof body !== 'string' ||
    !/^[0-9a-fA-F]*$/.test(body) ||
    body.length % 2 !== 0 ||
    (size !== undefined && body.length !== size * 2)
  ) {
    throw new GegAttestationError(
      size === undefined
        ? `${label}: expected hex`
        : `${label}: expected ${size} bytes of hex`
    );
  }
  return new Uint8Array(Buffer.from(body, 'hex'));
}

export interface BindingCredential {
  scheme?: string;
  electionId: string;
  pseudonym: string;
  vk: string;
  weight: number | string | bigint;
  nonce: number | string | bigint;
  signature: string;
}

/**
 * Verify the voter's Schnorr signature over the ballot — which, since the v2 ballot
 * message, covers the eligibility credential too.
 *
 * This replaced a separate `verifyBallotBinding` over a `SHUTTER-VOTE-BINDING-v1`
 * transcript. That transcript existed only because the credential sat outside the
 * signed ballot; folding it in made the ballot's own signature do the job, and
 * deleted four implementations of the binding across two languages.
 *
 * Scope is deliberately the signature alone, **not** `verifyBallot`. The ZK range and
 * budget proofs are the keypers' job at admission and cost ~1.3 s per ballot at
 * ℓ=5/B=100 — paying that at ingest would put it in the voter's request path for a
 * check that happens again downstream. What ingest owes the voter is refusing a
 * ballot the committee would silently drop, and a bad signature is exactly that.
 */
export interface VerifyBallotSignatureArgs {
  /** The ballot envelope as it arrived, hex-encoded. */
  envelope: any;
  /** The credential carried inside it. */
  attestation: BindingCredential;
}

export async function verifyBallotSignature(
  args: VerifyBallotSignatureArgs
): Promise<boolean> {
  try {
    // `G1Point.fromBytes` touches the BLST WASM heap, which has to be up first.
    await ensureCurvesInit();
    const { envelope, attestation } = args;
    const ciphertexts = (envelope?.ciphertexts ?? []).map((ct: any) => [
      hexToBytes(ct?.c1, 'c1', 96),
      hexToBytes(ct?.c2, 'c2', 96)
    ]) as [Uint8Array, Uint8Array][];
    if (!ciphertexts.length) return false;

    const message = arrayify(
      keccak256(
        canonicalBallotMessage({
          electionId: hexToBytes(envelope.electionId, 'electionId', 32),
          pseudonym: hexToBytes(envelope.pseudonym, 'pseudonym', 32),
          ciphertexts,
          zkProof: hexToBytes(envelope.zkProof, 'zkProof'),
          attestation: {
            electionId: hexToBytes(
              attestation.electionId,
              'att.electionId',
              32
            ),
            pseudonym: hexToBytes(attestation.pseudonym, 'att.pseudonym', 32),
            vk: hexToBytes(attestation.vk, 'att.vk', 48),
            weight: BigInt(attestation.weight),
            nonce: BigInt(attestation.nonce),
            signature: hexToBytes(attestation.signature, 'att.signature', 80)
          }
        })
      )
    );

    const sig = hexToBytes(envelope.voterSignature, 'voterSignature', 80);
    // The SDK exports `encodeSchnorr` but no decoder, so the 80-byte wire form is
    // split here: R (48, compressed G1) then s (32, big-endian).
    const R = G1Point.fromBytes(sig.slice(0, 48));
    const sScalar = BigInt(`0x${Buffer.from(sig.slice(48)).toString('hex')}`);
    const vk = G1Point.fromBytes(hexToBytes(envelope.vk, 'vk', 48));
    try {
      return schnorrVerify(vk, message, { R, s: sScalar });
    } finally {
      R.destroyWasm();
      vk.destroyWasm();
    }
  } catch {
    return false;
  }
}
