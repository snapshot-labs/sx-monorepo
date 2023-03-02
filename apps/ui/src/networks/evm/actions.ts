import { clients } from '@snapshot-labs/sx';
import { SUPPORTED_AUTHENTICATORS, SUPPORTED_STRATEGIES } from './constants';
import { verifyNetwork } from '@/helpers/utils';
import type { Web3Provider } from '@ethersproject/providers';
import type { NetworkActions } from '@/networks/types';
import type { Space, Proposal } from '@/types';

type Choice = 0 | 1 | 2;

const EXECUTOR = '0xb1001fdf62c020761039a750b27e73c512fdaa5e';

function pickAuthenticatorAndStrategies(authenticators: string[], strategies: string[]) {
  const authenticator = authenticators.find(
    authenticator => SUPPORTED_AUTHENTICATORS[authenticator]
  );

  const selectedStrategies = strategies
    .map((strategy, index) => ({ address: strategy, index } as const))
    .filter(({ address }) => SUPPORTED_STRATEGIES[address]);

  if (!authenticator || selectedStrategies.length === 0) {
    throw new Error('Unsupported space');
  }

  return { authenticator, strategies: selectedStrategies };
}

export function createActions(chainId: number): NetworkActions {
  const client = new clients.EvmEthereumTx();

  return {
    async createSpace(
      web3: any,
      params: {
        controller: string;
        votingDelay: number;
        minVotingDuration: number;
        maxVotingDuration: number;
        proposalThreshold: bigint;
        quorum: bigint;
        authenticators: string[];
        votingStrategies: string[];
        votingStrategiesParams: string[][];
        executionStrategies: string[];
        metadataUri: string;
      }
    ) {
      await verifyNetwork(web3, chainId);

      const response = await client.deploySpace({
        signer: web3.getSigner(),
        ...params,
        votingStrategies: params.votingStrategies.map((strategy, i) => ({
          addy: strategy,
          params: params.votingStrategiesParams[i][0] ?? '0x'
        }))
      });

      return { hash: response.txId };
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
        envelope: {
          data: {
            space: space.id,
            authenticator,
            strategies,
            executor: EXECUTOR,
            executionParams: [],
            metadataUri: `ipfs://${cid}`
          }
        }
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
        envelope: {
          data: {
            space: proposal.space.id,
            authenticator,
            strategies,
            proposal: proposal.proposal_id,
            choice: convertedChoice
          }
        }
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
