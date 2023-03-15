import { Provider } from '@ethersproject/providers';
import { clients, getExecutionData, getEvmStrategy, evmGoerli } from '@snapshot-labs/sx';
import {
  RELAYER_AUTHENTICATORS,
  SUPPORTED_AUTHENTICATORS,
  SUPPORTED_STRATEGIES
} from './constants';
import { verifyNetwork } from '@/helpers/utils';
import { convertToMetaTransactions } from '@/helpers/transactions';
import type { Web3Provider } from '@ethersproject/providers';
import type { NetworkActions, StrategyConfig, VotingPower } from '@/networks/types';
import type { MetaTransaction } from '@snapshot-labs/sx/dist/utils/encoding/execution-hash';
import type { Space, Proposal } from '@/types';

type Choice = 0 | 1 | 2;
type SpaceExecutionData = Pick<Space, 'executors' | 'executors_types'>;

const VANILLA_EXECUTOR = '0x6241b5c89350bb3c465179706cf26050ea32444f';

function buildExecution(space: SpaceExecutionData, transactions: MetaTransaction[]) {
  const avatarIndex = space.executors_types.findIndex(
    executorType => executorType === 'SimpleQuorumAvatar'
  );

  if (avatarIndex !== -1) {
    const address = space.executors[avatarIndex];

    const networkConfig = {
      ...evmGoerli,
      executors: {
        ...evmGoerli.executors,
        [address]: {
          type: 'avatar' as const
        }
      }
    };

    return getExecutionData(space.executors[avatarIndex], networkConfig, { transactions });
  }

  if (space.executors.find(executor => executor === VANILLA_EXECUTOR)) {
    if (transactions.length) {
      console.warn('transactions will be ignored as vanilla executor is used');
    }

    return {
      executor: VANILLA_EXECUTOR,
      executionParams: ['0x00']
    };
  }

  throw new Error('No supported executor configured for this space');
}

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

  return {
    useRelayer: !!RELAYER_AUTHENTICATORS[authenticator],
    authenticator,
    strategies: selectedStrategies
  };
}

export function createActions(provider: Provider, chainId: number): NetworkActions {
  const manaUrl: string = import.meta.env.VITE_MANA_URL || 'http://localhost:3000';

  const client = new clients.EvmEthereumTx();
  const ethSigClient = new clients.EvmEthereumSig({
    manaUrl
  });

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
        authenticators: StrategyConfig[];
        votingStrategies: StrategyConfig[];
        executionStrategies: StrategyConfig[];
        metadataUri: string;
      }
    ) {
      await verifyNetwork(web3, chainId);

      const processedExecutionStrategies = await Promise.all(
        params.executionStrategies.map(async config =>
          config.deploy
            ? await config.deploy(client, web3.getSigner(), params.controller, config.params)
            : config.address
        )
      );

      const response = await client.deploySpace({
        signer: web3.getSigner(),
        ...params,
        authenticators: params.authenticators.map(config => config.address),
        votingStrategies: params.votingStrategies.map(config => ({
          addy: config.address,
          params: config.generateParams ? config.generateParams(config.params)[0] : '0x'
        })),
        votingStrategiesMetadata: params.votingStrategies.map(config =>
          config.generateMetadata ? config.generateMetadata(config.params) : '0x00'
        ),
        executionStrategies: processedExecutionStrategies.map((strategy, i) => {
          const config = params.executionStrategies[i];

          return {
            addy: strategy,
            params: config.generateParams
              ? config.generateParams(params.executionStrategies[i].params)[0]
              : []
          };
        })
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
    propose: async (
      web3: Web3Provider,
      account: string,
      space: Space,
      cid: string,
      transactions: MetaTransaction[]
    ) => {
      await verifyNetwork(web3, chainId);

      const { useRelayer, authenticator, strategies } = pickAuthenticatorAndStrategies(
        space.authenticators,
        space.strategies
      );

      const executionData = buildExecution(space, transactions);
      const index = space.executors.findIndex(executor => executor === executionData.executor);

      const data = {
        space: space.id,
        authenticator,
        strategies,
        executor: {
          index,
          address: executionData.executor
        },
        executionParams: executionData.executionParams[0],
        metadataUri: `ipfs://${cid}`
      };

      if (useRelayer) {
        return ethSigClient.propose({
          signer: web3.getSigner(),
          data
        });
      }

      return client.propose({
        signer: web3.getSigner(),
        envelope: {
          data
        }
      });
    },
    vote: async (web3: Web3Provider, account: string, proposal: Proposal, choice: number) => {
      await verifyNetwork(web3, chainId);

      if (choice < 1 || choice > 3) throw new Error('Invalid chocie');

      const { useRelayer, authenticator, strategies } = pickAuthenticatorAndStrategies(
        proposal.space.authenticators,
        proposal.strategies
      );

      let convertedChoice: Choice = 0;
      if (choice === 1) convertedChoice = 1;
      if (choice === 2) convertedChoice = 0;
      if (choice === 3) convertedChoice = 2;

      const data = {
        space: proposal.space.id,
        authenticator,
        strategies,
        proposal: proposal.proposal_id,
        choice: convertedChoice,
        metadataUri: ''
      };

      if (useRelayer) {
        return ethSigClient.vote({
          signer: web3.getSigner(),
          data
        });
      }

      return client.vote({
        signer: web3.getSigner(),
        envelope: {
          data
        }
      });
    },
    finalizeProposal: () => null,
    receiveProposal: () => null,
    executeTransactions: async (web3: Web3Provider, proposal: Proposal) => {
      await verifyNetwork(web3, chainId);

      const executionData = buildExecution(
        proposal.space,
        convertToMetaTransactions(proposal.execution)
      );

      return client.execute({
        signer: web3.getSigner(),
        space: proposal.space.id,
        proposal: proposal.proposal_id,
        executionParams: executionData.executionParams[0]
      });
    },
    send: (envelope: any) => ethSigClient.send(envelope),
    getVotingPower: async (
      strategiesAddresses: string[],
      strategiesParams: any[],
      strategiesMetadata: string[],
      voterAddress: string,
      timestamp: number
    ): Promise<VotingPower[]> => {
      return Promise.all(
        strategiesAddresses.map(async (address, i) => {
          const strategy = getEvmStrategy(address, evmGoerli);
          if (!strategy) return { address, value: 0n, decimals: 0 };

          const value = await strategy.getVotingPower(
            address,
            voterAddress,
            timestamp,
            strategiesParams[i],
            provider
          );

          const token = strategy.type === 'comp' ? strategiesParams[i] : undefined;
          return {
            address,
            value,
            decimals: strategiesMetadata[i] ? parseInt(strategiesMetadata[i], 16) : 0,
            token
          };
        })
      );
    }
  };
}
