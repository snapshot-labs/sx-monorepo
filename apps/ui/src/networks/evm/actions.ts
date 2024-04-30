import { Provider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import {
  clients,
  getEvmStrategy,
  evmOptimism,
  evmArbitrum,
  evmPolygon,
  evmMainnet,
  evmGoerli,
  evmSepolia,
  evmLineaGoerli,
  EvmNetworkConfig
} from '@snapshot-labs/sx';
import { MANA_URL, executionCall } from '@/helpers/mana';
import { CHAIN_IDS } from '@/helpers/constants';
import { createErc1155Metadata, verifyNetwork } from '@/helpers/utils';
import { convertToMetaTransactions } from '@/helpers/transactions';
import {
  getExecutionData,
  getSdkChoice,
  buildMetadata,
  parseStrategyMetadata,
  createStrategyPicker
} from '@/networks/common/helpers';
import { EVM_CONNECTORS } from '@/networks/common/constants';
import { vote as highlightVote } from '@/helpers/highlight';
import type { Web3Provider } from '@ethersproject/providers';
import type {
  Connector,
  NetworkActions,
  NetworkHelpers,
  SnapshotInfo,
  StrategyConfig,
  VotingPower
} from '@/networks/types';
import type { MetaTransaction } from '@snapshot-labs/sx/dist/utils/encoding/execution-hash';
import type {
  Space,
  Proposal,
  SpaceMetadata,
  StrategyParsedMetadata,
  Choice,
  NetworkID
} from '@/types';
import { getSwapLink } from '@/helpers/link';

const CONFIGS: Record<number, EvmNetworkConfig> = {
  10: evmOptimism,
  137: evmPolygon,
  42161: evmArbitrum,
  1: evmMainnet,
  5: evmGoerli,
  11155111: evmSepolia,
  59140: evmLineaGoerli
};

export function createActions(
  provider: Provider,
  helpers: NetworkHelpers,
  chainId: number
): NetworkActions {
  const networkConfig = CONFIGS[chainId];

  const pickAuthenticatorAndStrategies = createStrategyPicker({
    helpers,
    managerConnectors: EVM_CONNECTORS
  });

  const client = new clients.EvmEthereumTx({ networkConfig });
  const ethSigClient = new clients.EvmEthereumSig({
    networkConfig,
    manaUrl: MANA_URL
  });

  const getIsContract = async (address: string) => {
    const code = await provider.getCode(address);
    return code !== '0x';
  };

  return {
    async predictSpaceAddress(web3: Web3Provider, { salt }) {
      await verifyNetwork(web3, chainId);

      return client.predictSpaceAddress({ signer: web3.getSigner(), saltNonce: salt });
    },
    async deployDependency(
      web3: Web3Provider,
      params: {
        controller: string;
        spaceAddress: string;
        strategy: StrategyConfig;
      }
    ) {
      await verifyNetwork(web3, chainId);

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
      await verifyNetwork(web3, chainId);

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

      const response = await client.deploySpace({
        signer: web3.getSigner(),
        saltNonce: salt,
        params: {
          ...params,
          authenticators: params.authenticators.map(config => config.address),
          votingStrategies: params.votingStrategies.map(config => ({
            addr: config.address,
            params: config.generateParams ? config.generateParams(config.params)[0] : '0x'
          })),
          votingStrategiesMetadata: metadataUris,
          proposalValidationStrategy: {
            addr: params.validationStrategy.address,
            params: params.validationStrategy.generateParams
              ? params.validationStrategy.generateParams(params.validationStrategy.params)[0]
              : '0x'
          },
          metadataUri: `ipfs://${pinned.cid}`,
          proposalValidationStrategyMetadataUri,
          daoUri: ''
        }
      });

      return { txId: response.txId };
    },
    setMetadata: async (web3: Web3Provider, space: Space, metadata: SpaceMetadata) => {
      await verifyNetwork(web3, chainId);

      const pinned = await helpers.pin(
        createErc1155Metadata(metadata, {
          execution_strategies: space.executors,
          execution_strategies_types: space.executors_types
        })
      );

      return client.setMetadataUri({
        signer: web3.getSigner(),
        space: space.id,
        metadataUri: `ipfs://${pinned.cid}`
      });
    },
    propose: async (
      web3: Web3Provider,
      connectorType: Connector,
      account: string,
      space: Space,
      cid: string,
      executionStrategy: string | null,
      transactions: MetaTransaction[]
    ) => {
      await verifyNetwork(web3, chainId);

      const isContract = await getIsContract(account);

      const { relayerType, authenticator, strategies } = pickAuthenticatorAndStrategies({
        authenticators: space.authenticators,
        strategies: space.voting_power_validation_strategy_strategies,
        strategiesIndicies: space.voting_power_validation_strategy_strategies.map((_, i) => i),
        connectorType,
        isContract
      });

      let selectedExecutionStrategy;
      if (executionStrategy) {
        selectedExecutionStrategy = {
          addr: executionStrategy,
          params: getExecutionData(space, executionStrategy, transactions).executionParams[0]
        };
      } else {
        selectedExecutionStrategy = {
          addr: '0x0000000000000000000000000000000000000000',
          params: '0x'
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

      if (relayerType === 'evm') {
        return ethSigClient.propose({
          signer: web3.getSigner(),
          data
        });
      }

      return client.propose(
        {
          signer: web3.getSigner(),
          envelope: {
            data
          }
        },
        {
          noWait: isContract
        }
      );
    },
    async updateProposal(
      web3: Web3Provider,
      connectorType: Connector,
      account: string,
      space: Space,
      proposalId: number | string,
      cid: string,
      executionStrategy: string | null,
      transactions: MetaTransaction[]
    ) {
      await verifyNetwork(web3, chainId);

      const isContract = await getIsContract(account);

      const { relayerType, authenticator } = pickAuthenticatorAndStrategies({
        authenticators: space.authenticators,
        strategies: space.voting_power_validation_strategy_strategies,
        strategiesIndicies: space.voting_power_validation_strategy_strategies.map((_, i) => i),
        connectorType,
        isContract
      });

      let selectedExecutionStrategy;
      if (executionStrategy) {
        selectedExecutionStrategy = {
          addr: executionStrategy,
          params: getExecutionData(space, executionStrategy, transactions).executionParams[0]
        };
      } else {
        selectedExecutionStrategy = {
          addr: '0x0000000000000000000000000000000000000000',
          params: '0x'
        };
      }

      const data = {
        space: space.id,
        proposal: proposalId as number,
        authenticator,
        executionStrategy: selectedExecutionStrategy,
        metadataUri: `ipfs://${cid}`
      };

      if (relayerType === 'evm') {
        return ethSigClient.updateProposal({
          signer: web3.getSigner(),
          data
        });
      }

      return client.updateProposal(
        {
          signer: web3.getSigner(),
          envelope: {
            data
          }
        },
        { noWait: isContract }
      );
    },
    cancelProposal: async (web3: Web3Provider, proposal: Proposal) => {
      await verifyNetwork(web3, chainId);

      const address = await web3.getSigner().getAddress();
      const isContract = await getIsContract(address);

      return client.cancel(
        {
          signer: web3.getSigner(),
          space: proposal.space.id,
          proposal: proposal.proposal_id as number
        },
        { noWait: isContract }
      );
    },
    vote: async (
      web3: Web3Provider,
      connectorType: Connector,
      account: string,
      proposal: Proposal,
      choice: Choice
    ) => {
      await verifyNetwork(web3, chainId);

      const isContract = await getIsContract(account);

      const { relayerType, authenticator, strategies } = pickAuthenticatorAndStrategies({
        authenticators: proposal.space.authenticators,
        strategies: proposal.strategies,
        strategiesIndicies: proposal.strategies_indicies,
        connectorType,
        isContract
      });

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
        choice: getSdkChoice(choice),
        metadataUri: '',
        chainId
      };

      if (!isContract && proposal.execution_strategy_type === 'Axiom') {
        return highlightVote({ signer: web3.getSigner(), data });
      }

      if (relayerType === 'evm') {
        return ethSigClient.vote({
          signer: web3.getSigner(),
          data
        });
      }

      return client.vote(
        {
          signer: web3.getSigner(),
          envelope: {
            data
          }
        },
        { noWait: isContract }
      );
    },
    finalizeProposal: async (web3: Web3Provider, proposal: Proposal) => {
      await executionCall(chainId, 'finalizeProposal', {
        space: proposal.space.id,
        proposalId: proposal.proposal_id
      });

      return null;
    },
    executeTransactions: async (web3: Web3Provider, proposal: Proposal) => {
      await verifyNetwork(web3, chainId);

      const executionData = getExecutionData(
        proposal.space,
        proposal.execution_strategy,
        convertToMetaTransactions(proposal.execution)
      );

      return executionCall(chainId, 'execute', {
        space: proposal.space.id,
        proposalId: proposal.proposal_id,
        executionParams: executionData.executionParams[0]
      });
    },
    executeQueuedProposal: async (web3: Web3Provider, proposal: Proposal) => {
      await verifyNetwork(web3, chainId);

      const executionData = getExecutionData(
        proposal.space,
        proposal.execution_strategy,
        convertToMetaTransactions(proposal.execution)
      );

      return executionCall(chainId, 'executeQueuedProposal', {
        space: proposal.space.id,
        executionStrategy: proposal.execution_strategy,
        executionParams: executionData.executionParams[0]
      });
    },
    vetoProposal: async (web3: Web3Provider, proposal: Proposal) => {
      await verifyNetwork(web3, chainId);

      return client.vetoExecution({
        signer: web3.getSigner(),
        executionStrategy: proposal.execution_strategy,
        executionHash: proposal.execution_hash
      });
    },
    setVotingDelay: async (web3: Web3Provider, space: Space, votingDelay: number) => {
      await verifyNetwork(web3, chainId);

      const address = await web3.getSigner().getAddress();
      const isContract = await getIsContract(address);

      return client.setVotingDelay(
        {
          signer: web3.getSigner(),
          space: space.id,
          votingDelay
        },
        { noWait: isContract }
      );
    },
    setMinVotingDuration: async (web3: Web3Provider, space: Space, minVotingDuration: number) => {
      await verifyNetwork(web3, chainId);

      const address = await web3.getSigner().getAddress();
      const isContract = await getIsContract(address);

      return client.setMinVotingDuration(
        {
          signer: web3.getSigner(),
          space: space.id,
          minVotingDuration
        },
        { noWait: isContract }
      );
    },
    setMaxVotingDuration: async (web3: Web3Provider, space: Space, maxVotingDuration: number) => {
      await verifyNetwork(web3, chainId);

      const address = await web3.getSigner().getAddress();
      const isContract = await getIsContract(address);

      return client.setMaxVotingDuration(
        {
          signer: web3.getSigner(),
          space: space.id,
          maxVotingDuration
        },
        { noWait: isContract }
      );
    },
    transferOwnership: async (web3: Web3Provider, space: Space, owner: string) => {
      await verifyNetwork(web3, chainId);

      const address = await web3.getSigner().getAddress();
      const isContract = await getIsContract(address);

      return client.transferOwnership(
        {
          signer: web3.getSigner(),
          space: space.id,
          owner
        },
        { noWait: isContract }
      );
    },
    delegate: async (
      web3: Web3Provider,
      space: Space,
      networkId: NetworkID,
      delegatee: string,
      delegationContract: string
    ) => {
      await verifyNetwork(web3, CHAIN_IDS[networkId]);

      const [, contractAddress] = delegationContract.split(':');

      const votesContract = new Contract(
        contractAddress,
        ['function delegate(address delegatee)'],
        web3.getSigner()
      );

      return votesContract.delegate(delegatee);
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
      await verifyNetwork(web3, chainId);

      const metadataUris = await Promise.all(
        votingStrategiesToAdd.map(config => buildMetadata(helpers, config))
      );

      const proposalValidationStrategyMetadataUri = await buildMetadata(
        helpers,
        validationStrategy
      );

      return client.updateSettings({
        signer: web3.getSigner(),
        space: space.id,
        settings: {
          authenticatorsToAdd: authenticatorsToAdd.map(config => config.address),
          authenticatorsToRemove: space.authenticators.filter((authenticator, index) =>
            authenticatorsToRemove.includes(index)
          ),
          votingStrategiesToAdd: votingStrategiesToAdd.map(config => ({
            addr: config.address,
            params: config.generateParams ? config.generateParams(config.params)[0] : '0x'
          })),
          votingStrategiesToRemove: votingStrategiesToRemove.map(
            index => space.strategies_indicies[index]
          ),
          votingStrategyMetadataUrisToAdd: metadataUris,
          proposalValidationStrategy: {
            addr: validationStrategy.address,
            params: validationStrategy.generateParams
              ? validationStrategy.generateParams(validationStrategy.params)[0]
              : '0x'
          },
          proposalValidationStrategyMetadataUri
        }
      });
    },
    send: (envelope: any) => ethSigClient.send(envelope),
    getVotingPower: async (
      spaceId: string,
      strategiesAddresses: string[],
      strategiesParams: any[],
      strategiesMetadata: StrategyParsedMetadata[],
      voterAddress: string,
      snapshotInfo: SnapshotInfo
    ): Promise<VotingPower[]> => {
      if (snapshotInfo.at === null) throw new Error('EVM requires block number to be defined');

      return Promise.all(
        strategiesAddresses.map(async (address, i) => {
          const strategy = getEvmStrategy(address, networkConfig);
          if (!strategy) return { address, value: 0n, decimals: 0, token: null, symbol: '' };

          const strategyMetadata = await parseStrategyMetadata(strategiesMetadata[i].payload);

          const value = await strategy.getVotingPower(
            address,
            voterAddress,
            strategyMetadata,
            snapshotInfo.at!,
            strategiesParams[i],
            provider
          );

          const token = ['comp', 'ozVotes'].includes(strategy.type)
            ? strategiesParams[i]
            : undefined;
          return {
            address,
            value,
            decimals: strategiesMetadata[i]?.decimals ?? 0,
            symbol: strategiesMetadata[i]?.symbol ?? '',
            token,
            swapLink: getSwapLink(strategy.type, address, chainId)
          };
        })
      );
    }
  };
}
