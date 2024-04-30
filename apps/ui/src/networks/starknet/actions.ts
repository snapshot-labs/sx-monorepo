import {
  starknetMainnet,
  starknetGoerli,
  starknetSepolia,
  clients,
  getStarknetStrategy,
  NetworkConfig
} from '@snapshot-labs/sx';
import { MANA_URL } from '@/helpers/mana';
import { createErc1155Metadata, verifyNetwork } from '@/helpers/utils';
import {
  getExecutionData,
  getSdkChoice,
  buildMetadata,
  parseStrategyMetadata,
  createStrategyPicker
} from '@/networks/common/helpers';
import { EVM_CONNECTORS, STARKNET_CONNECTORS } from '@/networks/common/constants';
import { CallData, type Account, type RpcProvider } from 'starknet';
import type { MetaTransaction } from '@snapshot-labs/sx/dist/utils/encoding/execution-hash';
import type {
  Connector,
  NetworkActions,
  NetworkHelpers,
  SnapshotInfo,
  StrategyConfig,
  VotingPower
} from '@/networks/types';
import type {
  Space,
  SpaceMetadata,
  StrategyParsedMetadata,
  Proposal,
  Choice,
  NetworkID
} from '@/types';
import { getProvider } from '@/helpers/provider';

const CONFIGS: Partial<Record<NetworkID, NetworkConfig>> = {
  sn: starknetMainnet,
  'sn-tn': starknetGoerli,
  'sn-sep': starknetSepolia
};

export function createActions(
  networkId: NetworkID,
  starkProvider: RpcProvider,
  helpers: NetworkHelpers,
  { l1ChainId, ethUrl }: { l1ChainId: number; ethUrl: string }
): NetworkActions {
  const networkConfig = CONFIGS[networkId];
  if (!networkConfig) throw new Error(`Unsupported network ${networkId}`);

  const l1Provider = getProvider(l1ChainId);

  const clientConfig = {
    starkProvider,
    manaUrl: MANA_URL,
    ethUrl,
    networkConfig
  };

  const pickAuthenticatorAndStrategies = createStrategyPicker({
    helpers,
    managerConnectors: STARKNET_CONNECTORS,
    lowPriorityAuthenticators: ['evm-tx']
  });

  const getIsContract = async (connectorType: Connector, address: string) => {
    if (!EVM_CONNECTORS.includes(connectorType)) return false;

    const code = await l1Provider.getCode(address);
    return code !== '0x';
  };

  const client = new clients.StarknetTx(clientConfig);
  const starkSigClient = new clients.StarknetSig(clientConfig);
  const ethSigClient = new clients.EthereumSig(clientConfig);
  const ethTxClient = new clients.EthereumTx(clientConfig);

  return {
    async predictSpaceAddress(web3: any, { salt }) {
      return client.predictSpaceAddress({ account: web3.provider.account, saltNonce: salt });
    },
    async deployDependency(
      web3: any,
      params: {
        controller: string;
        spaceAddress: string;
        strategy: StrategyConfig;
      }
    ) {
      if (!params.strategy.deploy) {
        throw new Error('This strategy is not deployable');
      }

      return params.strategy.deploy(
        client,
        web3.getSigner(),
        params.controller,
        params.spaceAddress,
        params.strategy.params
      );
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
        params.votingStrategies.map(config => buildMetadata(helpers, config))
      );

      const proposalValidationStrategyMetadataUri = await buildMetadata(
        helpers,
        params.validationStrategy
      );

      return client.deploySpace({
        account: web3.provider.account,
        saltNonce: salt,
        params: {
          ...params,
          proposalValidationStrategy: {
            addr: params.validationStrategy.address,
            params: params.validationStrategy.generateParams
              ? params.validationStrategy.generateParams(params.validationStrategy.params)
              : []
          },
          proposalValidationStrategyMetadataUri,
          metadataUri: `ipfs://${pinned.cid}`,
          daoUri: '',
          authenticators: params.authenticators.map(config => config.address),
          votingStrategies: params.votingStrategies.map(config => ({
            addr: config.address,
            params: config.generateParams ? config.generateParams(config.params) : []
          })),
          votingStrategiesMetadata: metadataUris
        }
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
        strategiesIndicies: space.voting_power_validation_strategy_strategies.map((_, i) => i),
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

      const strategiesWithMetadata = await Promise.all(
        strategies.map(async strategy => {
          const metadata = await parseStrategyMetadata(
            space.voting_power_validation_strategies_parsed_metadata[strategy.index].payload
          );

          return {
            ...strategy,
            metadata
          };
        })
      );

      const data = {
        space: space.id,
        authenticator,
        strategies: strategiesWithMetadata,
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
      proposalId: number | string,
      cid: string,
      executionStrategy: string | null,
      transactions: MetaTransaction[]
    ) {
      const isContract = await getIsContract(connectorType, account);

      const { relayerType, authenticator } = pickAuthenticatorAndStrategies({
        authenticators: space.authenticators,
        strategies: space.voting_power_validation_strategy_strategies,
        strategiesIndicies: space.voting_power_validation_strategy_strategies.map((_, i) => i),
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
        proposal: proposalId as number,
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
        proposal: proposal.proposal_id as number
      });
    },
    vote: async (
      web3: any,
      connectorType: Connector,
      account: string,
      proposal: Proposal,
      choice: Choice
    ) => {
      const isContract = await getIsContract(connectorType, account);

      const { relayerType, authenticator, strategies } = pickAuthenticatorAndStrategies({
        authenticators: proposal.space.authenticators,
        strategies: proposal.strategies,
        strategiesIndicies: proposal.strategies_indicies,
        connectorType,
        isContract
      });

      if (relayerType && ['evm', 'evm-tx'].includes(relayerType)) {
        await verifyNetwork(web3, l1ChainId);
      }

      const strategiesWithMetadata = await Promise.all(
        strategies.map(async strategy => {
          const metadataIndex = proposal.strategies_indicies.indexOf(strategy.index);

          const metadata = await parseStrategyMetadata(
            proposal.space.strategies_parsed_metadata[metadataIndex].payload
          );

          return {
            ...strategy,
            metadata
          };
        })
      );

      const data = {
        space: proposal.space.id,
        authenticator,
        strategies: strategiesWithMetadata,
        proposal: proposal.proposal_id as number,
        choice: getSdkChoice(choice)
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
    updateStrategies: async (
      web3: any,
      space: Space,
      authenticatorsToAdd: StrategyConfig[],
      authenticatorsToRemove: number[],
      votingStrategiesToAdd: StrategyConfig[],
      votingStrategiesToRemove: number[],
      validationStrategy: StrategyConfig
    ) => {
      const metadataUris = await Promise.all(
        votingStrategiesToAdd.map(config => buildMetadata(helpers, config))
      );

      const proposalValidationStrategyMetadataUri = await buildMetadata(
        helpers,
        validationStrategy
      );

      return client.updateSettings({
        signer: web3.provider.account,
        space: space.id,
        settings: {
          authenticatorsToAdd: authenticatorsToAdd.map(config => config.address),
          authenticatorsToRemove: space.authenticators.filter((authenticator, index) =>
            authenticatorsToRemove.includes(index)
          ),
          votingStrategiesToAdd: votingStrategiesToAdd.map(config => ({
            addr: config.address,
            params: config.generateParams ? config.generateParams(config.params) : []
          })),
          votingStrategiesToRemove: votingStrategiesToRemove.map(
            index => space.strategies_indicies[index]
          ),
          votingStrategyMetadataUrisToAdd: metadataUris,
          proposalValidationStrategy: {
            addr: validationStrategy.address,
            params: validationStrategy.generateParams
              ? validationStrategy.generateParams(validationStrategy.params)
              : []
          },
          proposalValidationStrategyMetadataUri
        }
      });
    },
    delegate: async (
      web3: any,
      space: Space,
      networkId: NetworkID,
      delegatee: string,
      delegationContract: string
    ) => {
      const [, contractAddress] = delegationContract.split(':');

      const { account }: { account: Account } = web3.provider;

      return account.execute({
        contractAddress,
        entrypoint: 'delegate',
        calldata: CallData.compile({
          delegatee
        })
      });
    },
    getVotingPower: async (
      spaceId: string,
      strategiesAddresses: string[],
      strategiesParams: any[],
      strategiesMetadata: StrategyParsedMetadata[],
      voterAddress: string,
      snapshotInfo: SnapshotInfo
    ): Promise<VotingPower[]> => {
      return Promise.all(
        strategiesAddresses.map(async (address, i) => {
          const strategy = getStarknetStrategy(address, networkConfig);
          if (!strategy) return { address, value: 0n, decimals: 0, token: null, symbol: '' };

          const strategyMetadata = await parseStrategyMetadata(strategiesMetadata[i].payload);

          const value = await strategy.getVotingPower(
            address,
            voterAddress,
            strategyMetadata,
            snapshotInfo.at,
            strategiesParams[i].split(','),
            {
              ...clientConfig,
              networkConfig
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
