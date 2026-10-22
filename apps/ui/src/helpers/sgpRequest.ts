/**
 * Browser copy of the digest that signed protocol requests are signed over.
 *
 * Must match the hub's `requestDigest` in `helpers/sgpDigests.ts` and SGP's
 * `shutter_governance_protocol.core.authz.request_digest` byte for byte. The hub's
 * version uses Node's `Buffer`, so it is not imported. The UI only needs it for
 * the admin "retry" action, which is signed in the wallet.
 *
 * Each field is written as a 4-byte big-endian length followed by its bytes, after
 * a domain-separation tag. This keeps field boundaries unambiguous, so a signature
 * for `tally_stall` cannot be reused as a `tally_resume`.
 *
 * The 32-byte digest is signed as raw bytes with EIP-191 (`signMessage` on the
 * byte array, not its hex string), which is what the hub's `verifyMessage` expects.
 */

import { arrayify, concat } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/keccak256';

const REQUEST_DST = new TextEncoder().encode(
  'SHUTTER-GOVERNANCE-PROTOCOL-REQUEST-v1'
);

function u32BE(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, false);
  return b;
}

/**
 * Payload for a stall/resume request: the issue time in seconds, as an unsigned
 * 8-byte big-endian integer. Must match the hub's `requestNoncePayload` and SGP's
 * `request_nonce_payload`.
 */
export function requestNoncePayload(issuedAt: number): Uint8Array {
  if (!Number.isInteger(issuedAt) || issuedAt < 0) {
    throw new Error(`issuedAt must be a non-negative integer, got ${issuedAt}`);
  }
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, BigInt(issuedAt), false);
  return b;
}

/**
 * `keccak256(DST ‖ len|op ‖ len|electionId ‖ len|payload)` as raw bytes.
 *
 * `electionId` is the Snapshot proposal id, used as the 32-byte election id. An id
 * of any other size throws instead of being padded, as the hub does too.
 */
export function requestDigest(
  op: string,
  electionId: string,
  payload: Uint8Array = new Uint8Array(0)
): Uint8Array {
  const eid = arrayify(electionId);
  if (eid.length !== 32) {
    throw new Error(
      `electionId must be 32 bytes, got ${eid.length} — the protocol reads it as bytes32`
    );
  }
  const opBytes = new TextEncoder().encode(op);
  const packed = concat([
    REQUEST_DST,
    u32BE(opBytes.length),
    opBytes,
    u32BE(eid.length),
    eid,
    u32BE(payload.length),
    payload
  ]);
  return arrayify(keccak256(packed));
}
