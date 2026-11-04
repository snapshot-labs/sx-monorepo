/**
 * Reads and clears the "tally stalled" flag. The coordinator sets this flag when
 * the keyper committee could not finish the tally after all its attempts.
 */

import { requestDigest, requestNoncePayload } from './sgpRequest';
import { endpoint } from './teVerify';

/** The fields of the hub's SGP election state that the stall UI needs. */
export type SgpElectionState = {
  tallyStalled: boolean;
  /**
   * The coordinator's reason for the stall, if it gave one. It is not signed, so
   * show it as the coordinator's claim and do not act on it automatically. Use
   * `diagnoseTally` in `teVerify`, which works from public share counts, instead.
   */
  tallyStallReason: string | null;
};

export async function fetchSgpElection(
  apiBaseUrl: string,
  proposalId: string
): Promise<SgpElectionState> {
  const r = await fetch(endpoint(apiBaseUrl, proposalId, 'te_sgp_election'), {
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
 * Asks the hub to clear the stall. The space admin signs
 * `requestDigest('tally_resume', proposalId, ...)` in their wallet.
 *
 * `signRaw` must sign the raw bytes (EIP-191 over the `Uint8Array`), which is what
 * the hub's `verifyMessage` expects. Signing the hex string recovers a different
 * address, and the hub rejects it as `not_the_admin`.
 */
export async function submitTallyResume(
  apiBaseUrl: string,
  proposalId: string,
  signRaw: (digest: Uint8Array) => Promise<string>
): Promise<void> {
  // The signed timestamp stops replay: the hub accepts each timestamp once, within
  // a short window. Otherwise one signature could clear every later stall too.
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
  // The hub only accepts a signature within a few minutes of `issuedAt`, so a wrong
  // device clock gives a 400. Explain that, since the fix is on the admin's machine.
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
