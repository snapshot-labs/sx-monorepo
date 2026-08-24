import { Wallet } from '@ethersproject/wallet';
import { clients, offchainMainnet } from '@snapshot-labs/sx';
import { AGENT_PRIVATE_KEY, VOTE_APP } from '../config';

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

const wallet = AGENT_PRIVATE_KEY ? new Wallet(AGENT_PRIVATE_KEY) : null;

export const AGENT_SIGNER_ADDRESS = wallet?.address ?? '';

function signer() {
  if (!wallet) throw new Error('AGENT_PRIVATE_KEY is not set');

  return wallet;
}

export async function signVote(vote: VoteData) {
  return client.vote({
    signer: signer(),
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

export async function castVote(vote: VoteData): Promise<string> {
  const result = (await client.send(await signVote(vote))) as { id?: string };

  return result.id ?? '';
}
