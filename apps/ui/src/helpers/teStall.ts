/**
 * Reading and clearing a stalled tally.
 *
 * A stalled tally is one the keyper committee could not complete: the coordinator
 * exhausted its attempts and persisted a flag saying so.
 */

import { requestDigest, requestNoncePayload } from './gegRequest';

/** What the hub reports for a geg election. Only the fields the stall UI needs. */
export type GegElectionState = {
  tallyStalled: boolean;
  /**
   * The coordinator's account of why, when it supplied one.
   *
   * Unsigned, unlike the flag beside it: it is a hint for an operator, not an
   * artifact. Present it as the coordinator's claim rather than as established
   * fact, and do not let it drive anything automatic — `teVerify`'s
   * `diagnoseTally` derives the keyper-vs-coordinator split from public share
   * counts, which is the part worth acting on.
   */
  tallyStallReason: string | null;
};

function endpoint(
  apiBaseUrl: string,
  proposalId: string,
  route: string
): string {
  return `${apiBaseUrl.replace(/\/$/, '')}/proposal/${encodeURIComponent(proposalId)}/${route}`;
}

export async function fetchGegElection(
  apiBaseUrl: string,
  proposalId: string
): Promise<GegElectionState> {
  const r = await fetch(endpoint(apiBaseUrl, proposalId, 'te_geg_election'), {
    credentials: 'omit'
  });
  if (!r.ok) throw new Error(`hub ${r.status}: ${await r.text()}`);
  const body = await r.json();
  return {
    tallyStalled: Boolean(body?.tallyStalled),
    tallyStallReason:
      typeof body?.tallyStallReason === 'string' && body.tallyStallReason
        ? body.tallyStallReason
        : null
  };
}

/**
 * Ask the hub to clear the stall, authorised by the admin's wallet signature over
 * `requestDigest('tally_resume', proposalId)`.
 *
 * The digest is signed as raw bytes: `signMessage` on a `Uint8Array` is EIP-191 over
 * those bytes, which is what the hub's `verifyMessage` reverses. Passing the hex
 * *string* would sign 66 ASCII characters instead and recover a different address —
 * refused as `not_the_admin`, which reads like the wallet is wrong rather than the
 * encoding.
 */
export async function submitTallyResume(
  apiBaseUrl: string,
  proposalId: string,
  signRaw: (digest: Uint8Array) => Promise<string>
): Promise<void> {
  // The signature says when it was made, and the hub accepts each timestamp once
  // inside a short window. Without it, one retry signature would authorise
  // un-stalling this proposal forever — including after the coordinator has
  // legitimately stalled it again.
  const issuedAt = Math.floor(Date.now() / 1000);
  const adminSig = await signRaw(
    requestDigest('tally_resume', proposalId, requestNoncePayload(issuedAt))
  );
  const r = await fetch(endpoint(apiBaseUrl, proposalId, 'te_tally_stalled'), {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stalled: false, adminSig, issuedAt })
  });
  if (r.status === 403) {
    throw new Error(
      "The hub refused this signature. Only an admin of this proposal's space can retry a tally."
    );
  }
  // The signature is only valid for a few minutes around the time it was made, so a
  // clock that is far off produces a signature the hub considers expired before it
  // arrives. Worth naming: the raw 400 reads like a server fault, and the fix is on
  // the admin's own machine.
  if (r.status === 400) {
    const detail = await r.text();
    if (detail.includes('issuedAt')) {
      throw new Error(
        "This retry was signed too far from the hub's clock to be accepted. " +
          "Check that this device's date and time are set automatically, then try again."
      );
    }
    throw new Error(`hub 400: ${detail}`);
  }
  if (!r.ok) throw new Error(`hub ${r.status}: ${await r.text()}`);
}
