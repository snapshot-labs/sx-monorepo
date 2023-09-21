import { defaultNetwork, clients, getStarknetStrategy } from '@snapshot-labs/sx';
import { MANA_URL } from '@/helpers/mana';
import { createErc1155Metadata, verifyNetwork } from '@/helpers/utils';
import { getExecutionData, createStrategyPicker } from '@/networks/common/helpers';
import { EVM_CONNECTORS, STARKNET_CONNECTORS } from '@/networks/common/constants';
import {
  CONTRACT_SUPPORTED_AUTHENTICATORS,
  RELAYER_AUTHENTICATORS,
  SUPPORTED_AUTHENTICATORS,
  SUPPORTED_STRATEGIES
} from './constants';
import type { Provider } from 'starknet';
import type { MetaTransaction } from '@snapshot-labs/sx/dist/utils/encoding/execution-hash';
import type {
  Connector,
  NetworkActions,
  NetworkHelpers,
  StrategyConfig,
  VotingPower
} from '@/networks/types';
import type { Space, SpaceMetadata, StrategyParsedMetadata, Proposal } from '@/types';
import { getProvider } from '@/helpers/provider';

export function createActions(
  starkProvider: Provider,
  helpers: NetworkHelpers,
  { l1ChainId }: { l1ChainId: number }
): NetworkActions {
  const ethUrl: string = import.meta.env.VITE_ETH_RPC_URL;

  const l1Provider = getProvider(l1ChainId);

  const clientConfig = {
    starkProvider,
    manaUrl: MANA_URL,
    ethUrl
  };

  const pickAuthenticatorAndStrategies = createStrategyPicker({
    supportedAuthenticators: SUPPORTED_AUTHENTICATORS,
    supportedStrategies: SUPPORTED_STRATEGIES,
    contractSupportedAuthenticators: CONTRACT_SUPPORTED_AUTHENTICATORS,
    relayerAuthenticators: RELAYER_AUTHENTICATORS,
    managerConnectors: STARKNET_CONNECTORS,
    lowPriorityAuthenticators: ['evm-tx']
  });

  const getIsContract = async (connectorType: Connector, address: string) => {
    if (!EVM_CONNECTORS.includes(connectorType)) return false;

    const code = await l1Provider.getCode(address);
    return code !== '0x';
  };

  const client = new clients.StarkNetTx(clientConfig);
  const starkSigClient = new clients.StarkNetSig(clientConfig);
  const ethSigClient = new clients.EthereumSig(clientConfig);
  const ethTxClient = new clients.EthereumTx(clientConfig);

  return {
    async predictSpaceAddress(web3: any, { salt }) {
      return client.predictSpaceAddress({ salt });
    },
    async deployDependency() {
      throw new Error('Not implemented');
    },
    async createSpace(
      web3: any,
      salt: string,
      params: {
        controller: string;
        votingDelay: number;
        minVotingDuration: number;
        maxVotingDuration: number;
        authenticators: StrategyConfig[];
        validationStrategy: StrategyConfig;
        votingStrategies: StrategyConfig[];
        executionStrategies: StrategyConfig[];
        metadata: SpaceMetadata;
      }
    ) {
      const pinned = await helpers.pin(
        createErc1155Metadata(params.metadata, {
          execution_strategies: params.executionStrategies.map(config => config.address),
          execution_strategies_types: params.executionStrategies.map(config => config.type)
        })
      );

      const metadataUris = await Promise.all(
        params.votingStrategies.map(async config => {
          if (!config.generateMetadata) return '';

          const metadata = config.generateMetadata(config.params);
          const pinned = await helpers.pin(metadata);

          return `ipfs://${pinned.cid}`;
        })
      );

      return client.deploySpace({
        account: web3.provider.account,
        params: {
          ...params,
          proposalValidationStrategy: {
            addr: params.validationStrategy.address,
            params: params.validationStrategy.generateParams
              ? params.validationStrategy.generateParams(params.validationStrategy.params)
              : []
          },
          metadataUri: `ipfs://${pinned.cid}`,
          daoUri: '',
          authenticators: params.authenticators.map(config => config.address),
          votingStrategies: params.votingStrategies.map(config => ({
            addr: config.address,
            params: config.generateParams ? config.generateParams(config.params) : []
          })),
          votingStrategiesMetadata: metadataUris
        },
        salt
      });
    },
    setMetadata: async (web3: any, space: Space, metadata: SpaceMetadata) => {
      const pinned = await helpers.pin(
        createErc1155Metadata(metadata, {
          execution_strategies: space.executors,
          execution_strategies_types: space.executors_types
        })
      );

      return client.setMetadataUri({
        signer: web3.provider.account,
        space: space.id,
        metadataUri: `ipfs://${pinned.cid}`
      });
    },
    propose: async (
      web3: any,
      connectorType: Connector,
      account: string,
      space: Space,
      cid: string,
      executionStrategy: string | null,
      transactions: MetaTransaction[]
    ) => {
      const isContract = await getIsContract(connectorType, account);

      const { relayerType, authenticator, strategies } = pickAuthenticatorAndStrategies({
        authenticators: space.authenticators,
        strategies: space.voting_power_validation_strategy_strategies,
        connectorType,
        isContract
      });

      if (relayerType && ['evm', 'evm-tx'].includes(relayerType)) {
        await verifyNetwork(web3, l1ChainId);
      }

      let selectedExecutionStrategy;
      if (executionStrategy) {
        selectedExecutionStrategy = {
          addr: executionStrategy,
          params: getExecutionData(space, executionStrategy, transactions).executionParams[0]
        };
      } else {
        selectedExecutionStrategy = {
          addr: '0x0000000000000000000000000000000000000000',
          params: []
        };
      }

      const data = {
        space: space.id,
        authenticator,
        strategies,
        executionStrategy: selectedExecutionStrategy,
        metadataUri: `ipfs://${cid}`
      };

      if (relayerType === 'starknet') {
        return starkSigClient.propose({
          signer: web3.provider.account,
          data
        });
      } else if (relayerType === 'evm') {
        return ethSigClient.propose({
          signer: web3.getSigner(),
          data
        });
      } else if (relayerType === 'evm-tx') {
        return ethTxClient.initializePropose(web3.getSigner(), data, { noWait: isContract });
      }

      return client.propose(web3.provider.account, {
        data
      });
    },
    async updateProposal(
      web3: any,
      connectorType: Connector,
      account: string,
      space: Space,
      proposalId: number,
      cid: string,
      executionStrategy: string | null,
      transactions: MetaTransaction[]
    ) {
      const isContract = await getIsContract(connectorType, account);

      const { relayerType, authenticator } = pickAuthenticatorAndStrategies({
        authenticators: space.authenticators,
        strategies: space.voting_power_validation_strategy_strategies,
        connectorType,
        isContract
      });

      if (relayerType && ['evm', 'evm-tx'].includes(relayerType)) {
        await verifyNetwork(web3, l1ChainId);
      }

      let selectedExecutionStrategy;
      if (executionStrategy) {
        selectedExecutionStrategy = {
          addr: executionStrategy,
          params: getExecutionData(space, executionStrategy, transactions).executionParams[0]
        };
      } else {
        selectedExecutionStrategy = {
          addr: '0x0000000000000000000000000000000000000000',
          params: []
        };
      }

      const data = {
        space: space.id,
        proposal: proposalId,
        authenticator,
        executionStrategy: selectedExecutionStrategy,
        metadataUri: `ipfs://${cid}`
      };

      if (relayerType === 'starknet') {
        return starkSigClient.updateProposal({
          signer: web3.provider.account,
          data
        });
      } else if (relayerType === 'evm') {
        return ethSigClient.updateProposal({
          signer: web3.getSigner(),
          data
        });
      } else if (relayerType === 'evm-tx') {
        return ethTxClient.initializeUpdateProposal(web3.getSigner(), data, { noWait: isContract });
      }

      return client.updateProposal(web3.provider.account, {
        data
      });
    },
    cancelProposal: (web3: any, proposal: Proposal) => {
      return client.cancelProposal({
        signer: web3.provider.account,
        space: proposal.space.id,
        proposal: proposal.proposal_id
      });
    },
    vote: async (
      web3: any,
      connectorType: Connector,
      account: string,
      proposal: Proposal,
      choice: number
    ) => {
      const isContract = await getIsContract(connectorType, account);

      const { relayerType, authenticator, strategies } = pickAuthenticatorAndStrategies({
        authenticators: proposal.space.authenticators,
        strategies: proposal.strategies,
        connectorType,
        isContract
      });

      if (relayerType && ['evm', 'evm-tx'].includes(relayerType)) {
        await verifyNetwork(web3, l1ChainId);
      }

      const data = {
        space: proposal.space.id,
        authenticator,
        strategies,
        proposal: proposal.proposal_id,
        choice
      };

      if (relayerType === 'starknet') {
        return starkSigClient.vote({
          signer: web3.provider.account,
          data
        });
      } else if (relayerType === 'evm') {
        return ethSigClient.vote({
          signer: web3.getSigner(),
          data
        });
      } else if (relayerType === 'evm-tx') {
        return ethTxClient.initializeVote(web3.getSigner(), data, { noWait: isContract });
      }

      return client.vote(web3.provider.account, {
        data
      });
    },
    finalizeProposal: () => null,
    receiveProposal: () => null,
    executeTransactions: () => null,
    executeQueuedProposal: () => null,
    vetoProposal: () => null,
    setVotingDelay: async (web3: any, space: Space, votingDelay: number) => {
      return client.setVotingDelay({
        signer: web3.provider.account,
        space: space.id,
        votingDelay
      });
    },
    setMinVotingDuration: async (web3: any, space: Space, minVotingDuration: number) => {
      return client.setMinVotingDuration({
        signer: web3.provider.account,
        space: space.id,
        minVotingDuration
      });
    },
    setMaxVotingDuration: async (web3: any, space: Space, maxVotingDuration: number) => {
      return client.setMaxVotingDuration({
        signer: web3.provider.account,
        space: space.id,
        maxVotingDuration
      });
    },
    transferOwnership: async (web3: any, space: Space, owner: string) => {
      return client.transferOwnership({
        signer: web3.provider.account,
        space: space.id,
        owner
      });
    },
    getVotingPower: async (
      strategiesAddresses: string[],
      strategiesParams: any[],
      strategiesMetadata: StrategyParsedMetadata[],
      voterAddress: string,
      timestamp: number | null
    ): Promise<VotingPower[]> => {
      return Promise.all(
        strategiesAddresses.map(async (address, i) => {
          const strategy = getStarknetStrategy(address, defaultNetwork);
          if (!strategy) return { address, value: 0n, decimals: 0, token: null, symbol: '' };

          const value = await strategy.getVotingPower(
            address,
            voterAddress,
            null,
            timestamp,
            strategiesParams[i].split(','),
            {
              ...clientConfig,
              networkConfig: defaultNetwork
            }
          );

          return {
            address,
            value,
            decimals: strategiesMetadata[i]?.decimals ?? 0,
            symbol: strategiesMetadata[i]?.symbol ?? '',
            token: strategiesMetadata[i]?.token ?? null
          };
        })
      );
    },
    send: (envelope: any) => starkSigClient.send(envelope) // TODO: extract it out of client to common helper
  };
}
