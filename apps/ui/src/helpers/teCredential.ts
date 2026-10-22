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
}

/**
 * Asks the sequencer for a credential for this ballot key.
 *
 * The request is not signed. A credential is only usable by the named voter: the
 * sequencer derives the pseudonym from the EIP-712-signed voter and rejects any
 * envelope that does not match. If this fails the user cannot vote, so the
 * sequencer's error is passed through as-is.
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
