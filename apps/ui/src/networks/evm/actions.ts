import { clients } from '@snapshot-labs/sx';
import { SUPPORTED_AUTHENTICATORS, SUPPORTED_STRATEGIES } from './constants';
import { verifyNetwork } from '@/helpers/utils';
import type { Web3Provider } from '@ethersproject/providers';
import type { NetworkActions } from '@/networks/types';
import type { Space, Proposal } from '@/types';

type Choice = 0 | 1 | 2;

const EXECUTOR = '0x81519C29621Ba131ea398c15B17391F53e8B9A94';

function pickAuthenticatorAndStrategies(authenticators: string[], strategies: string[]) {
  const authenticator = authenticators.find(
    authenticator => SUPPORTED_AUTHENTICATORS[authenticator]
  );

  const selectedStrategies = strategies
    .map((strategy, index) => [index, strategy] as const)
    .filter(([, strategy]) => SUPPORTED_STRATEGIES[strategy])
    .map(([index]) => index);

  if (!authenticator || selectedStrategies.length === 0) {
    throw new Error('Unsupported space');
  }

  return { authenticator, strategies: selectedStrategies };
}

export function createActions(chainId: number): NetworkActions {
  const client = new clients.SnapshotEVMClient();

  return {
    createSpace() {
      throw new Error('createSpace is not implemented for this network');
    },
    setMetadataUri: async (web3: Web3Provider, spaceId: string, metadataUri: string) => {
      await verifyNetwork(web3, chainId);

      return client.setMetadataUri({
        signer: web3.getSigner(),
        space: spaceId,
        metadataUri
      });
    },
    propose: async (web3: Web3Provider, account: string, space: Space, cid: string) => {
      await verifyNetwork(web3, chainId);

      const { authenticator, strategies } = pickAuthenticatorAndStrategies(
        space.authenticators,
        space.strategies
      );

      return client.propose({
        signer: web3.getSigner(),
        space: space.id,
        authenticator,
        userVotingStrategies: strategies.map(index => ({
          index,
          params: '0x00'
        })),
        executionStrategy: { addy: EXECUTOR, params: '0x00' },
        metadataUri: `ipfs://${cid}`
      });
    },
    vote: async (web3: Web3Provider, account: string, proposal: Proposal, choice: number) => {
      await verifyNetwork(web3, chainId);

      if (choice < 1 || choice > 3) throw new Error('Invalid chocie');

      const { authenticator, strategies } = pickAuthenticatorAndStrategies(
        proposal.space.authenticators,
        proposal.strategies
      );

      // NOTE: here 0 is For
      const convertedChoice: Choice = (choice - 1) as Choice;

      return client.vote({
        signer: web3.getSigner(),
        space: proposal.space.id,
        authenticator,
        userVotingStrategies: strategies.map(index => ({
          index,
          params: '0x00'
        })),
        proposal: proposal.proposal_id,
        choice: convertedChoice
      });
    },
    finalizeProposal: async (web3: Web3Provider, proposal: Proposal) => {
      await verifyNetwork(web3, chainId);

      return client.finalizeProposal({
        signer: web3.getSigner(),
        space: proposal.space.id,
        proposal: proposal.proposal_id,
        executionParams: '0x00'
      });
    },
    receiveProposal: () => null,
    executeTransactions: () => null,
    send: (): any => null
  };
}
