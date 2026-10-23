/**
 * Election id to Snapshot proposal id.
 *
 * The protocol client puts the 32-byte election id in the path as bare lowercase
 * hex; Snapshot proposal ids are `0x`-prefixed. Both forms are accepted and the
 * `0x` form is sent to the hub. A malformed id is rejected with 400 here, rather
 * than reaching the hub as a confusing 404 or matching another proposal.
 *
 * Only path segments use bare hex. Byte fields in JSON bodies, including ids in
 * responses, are `0x`-prefixed (the client rejects them otherwise), so responses
 * pass ids through unchanged.
 */

export class BadElectionId extends Error {}

const HEX32 = /^[0-9a-fA-F]{64}$/;

/** Bare or `0x`-prefixed 32-byte hex → the `0x`-prefixed lowercase form. */
export function toProposalId(eid: string): string {
  const body =
    eid.startsWith('0x') || eid.startsWith('0X') ? eid.slice(2) : eid;
  if (!HEX32.test(body)) {
    throw new BadElectionId(
      `election id must be 32 bytes of hex (got ${eid.length} chars)`
    );
  }
  return `0x${body.toLowerCase()}`;
}
