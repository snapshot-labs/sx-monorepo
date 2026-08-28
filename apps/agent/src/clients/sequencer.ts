import { Wallet } from '@ethersproject/wallet';
import { clients, offchainMainnet } from '@snapshot-labs/sx';
import { CdpSigner } from '../cdp';
import { VOTE_APP } from '../config';

const client = new clients.OffchainEthereumSig({
  networkConfig: offchainMainnet
});

const FINAL_ERRORS = [
  'no voting power',
  'not in voting window',
  'wrong alias',
  'failed vote validation',
  'unknown proposal',
  'invalid choice',
  'already voted at later time'
];

export function isFinalError(message: string): boolean {
  return FINAL_ERRORS.some(error => message.includes(error));
}

export type VoteData = {
  from: string;
  space: string;
  proposal: string;
  type: string;
  choice: number;
  reason: string;
};

export async function signVote(vote: VoteData, signer: Wallet | CdpSigner) {
  return client.vote({
    signer: signer as Wallet,
    data: {
      ...vote,
      privacy: 'none',
      app: VOTE_APP,
      authenticator: '',
      strategies: [],
      metadataUri: ''
    } as Parameters<typeof client.vote>[0]['data']
  });
}

export async function castVote(
  vote: VoteData,
  signer: CdpSigner
): Promise<string> {
  const envelope = await signVote(vote, signer);
  const result: { id?: string } = await client.send(envelope);

  return result.id ?? '';
}
