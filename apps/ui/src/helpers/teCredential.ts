export interface BallotCredential {
  scheme: string;
  electionId: string;
  pseudonym: string;
  vk: string;
  weight: number;
  nonce: number;
  signature: string;
}

export interface IssuedCredentialResponse {
  attestation: BallotCredential;
  /** Voting power as held, for display beside the scaled figure. */
  votingPower: number;
}

/**
 * Ask the sequencer for a credential for this ballot key.
 *
 * No signature: the request names the voter and proves nothing, because a
 * credential is worthless to anyone else. Ingest derives the pseudonym from the
 * EIP-712-authenticated voter and refuses any envelope that disagrees, so a
 * credential naming this address can only be spent by a vote this address signs.
 * Requiring a `personal_sign` here was tried and removed — it added a second
 * wallet prompt to every private vote and bought no integrity the pseudonym check
 * does not already give.
 *
 * The voter cannot vote at all if this fails — a real availability change from
 * minting at ingest, and the reason the error is surfaced verbatim rather than
 * folded into a generic failure.
 */
export async function requestBallotCredential(args: {
  sequencerUrl: string;
  space: string;
  proposalId: string;
  vk: string;
  voter: string;
}): Promise<IssuedCredentialResponse> {
  const res = await fetch(
    `${args.sequencerUrl.replace(/\/$/, '')}/te_attestation`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        space: args.space,
        proposal: args.proposalId,
        vk: args.vk,
        voter: args.voter
      })
    }
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `could not obtain a ballot credential (${res.status}): ${detail}`
    );
  }
  return (await res.json()) as IssuedCredentialResponse;
}
