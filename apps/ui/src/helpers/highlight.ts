import { Wallet } from '@ethersproject/wallet';
import { Client } from '@snapshot-labs/highlight';

const WALLET_PRIVATE_KEY = Wallet.createRandom().privateKey;

export const HIGHLIGHT_URL =
  import.meta.env.VITE_HIGHLIGHT_URL || 'https://livenet.highlight.box';

const signer = new Wallet(WALLET_PRIVATE_KEY);

export const client = new Client({
  url: `${HIGHLIGHT_URL}/highlight`,
  signer
});

export const baseDomain = {
  name: 'snapshot-x',
  version: '1.0.0'
};

type EIP712VoteMessage = {
  space: string;
  voter: string;
  proposalId: number;
  choice: number;
};

export const voteTypes = {
  Vote: [
    { name: 'space', type: 'address' },
    { name: 'voter', type: 'address' },
    { name: 'proposalId', type: 'uint256' },
    { name: 'choice', type: 'uint8' }
  ]
};

export async function vote({ signer, data }): Promise<any> {
  const voter = await signer.getAddress();

  const domain = {
    ...baseDomain,
    chainId: data.chainId,
    verifyingContract: data.space
  };

  const message: EIP712VoteMessage = {
    space: data.space,
    voter,
    proposalId: data.proposal,
    choice: data.choice
  };

  const signature = await signer._signTypedData(domain, voteTypes, message);

  const signatureData = {
    address: voter,
    signature,
    domain,
    types: voteTypes,
    message
  };

  const receipt = await client.votes.vote({
    space: data.space,
    voter,
    proposalId: data.proposal,
    choice: data.choice,
    chainId: data.chainId,
    sig: signature
  });
  console.log('Receipt', receipt);

  return { payloadType: 'HIGHLIGHT_VOTE', signatureData, data };
}
