/**
 * Election-id translation.
 *
 * The protocol's client sends an election id as **bare** lowercase hex — it takes
 * the 32-byte value and hex-encodes it, with no prefix. Snapshot stores proposal
 * ids `0x`-prefixed. Both forms are accepted on the way in so a hand-typed request
 * behaves, and the `0x` form is what goes to the hub.
 *
 * Validation is strict rather than forgiving. A malformed id must become a clean
 * 400 here, because passing it through would surface as a confusing 404 from the
 * hub — or worse, match a different proposal.
 *
 * Note the asymmetry, which is easy to get backwards: only *path segments* use bare
 * hex. Every byte field inside a JSON body — including an election id in a response
 * — is `0x`-prefixed, because the client decodes those with a decoder that rejects a
 * missing prefix outright. So responses pass ids through untouched; there is no
 * reverse conversion.
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
