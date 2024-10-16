import { Contract } from '@ethersproject/contracts';
import { Provider, Web3Provider } from '@ethersproject/providers';
import { formatBytes32String } from '@ethersproject/strings';
import {
  clients,
  evmArbitrum,
  evmLineaGoerli,
  evmMainnet,
  EvmNetworkConfig,
  evmOptimism,
  evmPolygon,
  evmSepolia,
  getEvmStrategy
} from '@snapshot-labs/sx';
import { vote as highlightVote } from '@/helpers/highlight';
import { getSwapLink } from '@/helpers/link';
import { executionCall, MANA_URL } from '@/helpers/mana';
import { convertToMetaTransactions } from '@/helpers/transactions';
import { createErc1155Metadata, verifyNetwork } from '@/helpers/utils';
import { EVM_CONNECTORS } from '@/networks/common/constants';
import {
  buildMetadata,
  createStrategyPicker,
  getExecutionData,
  getSdkChoice,
  parseStrategyMetadata
} from '@/networks/common/helpers';
import {
  Connector,
  ExecutionInfo,
  NetworkActions,
  NetworkHelpers,
  SnapshotInfo,
  StrategyConfig,
  VotingPower
} from '@/networks/types';
import {
  ChainId,
  Choice,
  DelegationType,
  NetworkID,
  Proposal,
  Space,
  SpaceMetadata,
  StrategyParsedMetadata,
  VoteType
} from '@/types';

const CONFIGS: Record<number, EvmNetworkConfig> = {
  10: evmOptimism,
  137: evmPolygon,
  42161: evmArbitrum,
  1: evmMainnet,
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

      return client.predictSpaceAddress({
        signer: web3.getSigner(),
        saltNonce: salt
      });
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
        web3,
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
        executionDestinations: string[];
        metadata: SpaceMetadata;
      }
    ) {
      await verifyNetwork(web3, chainId);

      const pinned = await helpers.pin(
        createErc1155Metadata(params.metadata, {
          execution_strategies: params.executionStrategies.map(
            config => config.address
          ),
          execution_strategies_types: params.executionStrategies.map(
            config => config.type
          ),
          execution_destinations: params.executionDestinations
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
            params: config.generateParams
              ? config.generateParams(config.params)[0]
              : '0x'
          })),
          votingStrategiesMetadata: metadataUris,
          proposalValidationStrategy: {
            addr: params.validationStrategy.address,
            params: params.validationStrategy.generateParams
              ? params.validationStrategy.generateParams(
                  params.validationStrategy.params
                )[0]
              : '0x'
          },
          metadataUri: `ipfs://${pinned.cid}`,
          proposalValidationStrategyMetadataUri,
          daoUri: ''
        }
      });

      return { txId: response.txId };
    },
    setMetadata: async (
      web3: Web3Provider,
      space: Space,
      metadata: SpaceMetadata
    ) => {
      await verifyNetwork(web3, chainId);

      const pinned = await helpers.pin(
        createErc1155Metadata(metadata, {
          execution_strategies: space.executors,
          execution_strategies_types: space.executors_types,
          execution_destinations: space.executors_destinations
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
      title: string,
      body: string,
      discussion: string,
      type: VoteType,
      choices: string[],
      labels: string[],
      executions: ExecutionInfo[] | null
    ) => {
      await verifyNetwork(web3, chainId);

      const executionInfo = executions?.[0];
      const pinned = await helpers.pin({
        title,
        body,
        discussion,
        type,
        choices: choices.filter(c => !!c),
        execution: executionInfo?.transactions ?? []
      });
      if (!pinned || !pinned.cid) return false;
      console.log('IPFS', pinned);

      const isContract = await getIsContract(account);

      const { relayerType, authenticator, strategies } =
        pickAuthenticatorAndStrategies({
          authenticators: space.authenticators,
          strategies: space.voting_power_validation_strategy_strategies,
          strategiesIndicies:
            space.voting_power_validation_strategy_strategies.map((_, i) => i),
          connectorType,
          isContract
        });

      let selectedExecutionStrategy;
      if (executionInfo) {
        selectedExecutionStrategy = {
          addr: executionInfo.strategyAddress,
          params: getExecutionData(
            space,
            executionInfo.strategyAddress,
            executionInfo.destinationAddress,
            convertToMetaTransactions(executionInfo.transactions)
          ).executionParams[0]
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
            space.voting_power_validation_strategies_parsed_metadata[
              strategy.index
            ].payload
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
        metadataUri: `ipfs://${pinned.cid}`
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
      title: string,
      body: string,
      discussion: string,
      type: VoteType,
      choices: string[],
      labels: string[],
      executions: ExecutionInfo[] | null
    ) {
      await verifyNetwork(web3, chainId);

      const executionInfo = executions?.[0];
      const pinned = await helpers.pin({
        title,
        body,
        discussion,
        type,
        choices: choices.filter(c => !!c),
        execution: executionInfo?.transactions ?? []
      });
      if (!pinned || !pinned.cid) return false;
      console.log('IPFS', pinned);

      const isContract = await getIsContract(account);

      const { relayerType, authenticator } = pickAuthenticatorAndStrategies({
        authenticators: space.authenticators,
        strategies: space.voting_power_validation_strategy_strategies,
        strategiesIndicies:
          space.voting_power_validation_strategy_strategies.map((_, i) => i),
        connectorType,
        isContract
      });

      let selectedExecutionStrategy;
      if (executionInfo) {
        selectedExecutionStrategy = {
          addr: executionInfo.strategyAddress,
          params: getExecutionData(
            space,
            executionInfo.strategyAddress,
            executionInfo.destinationAddress,
            convertToMetaTransactions(executionInfo.transactions)
          ).executionParams[0]
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
        metadataUri: `ipfs://${pinned.cid}`
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
      choice: Choice,
      reason: string
    ) => {
      await verifyNetwork(web3, chainId);

      const isContract = await getIsContract(account);

      const { relayerType, authenticator, strategies } =
        pickAuthenticatorAndStrategies({
          authenticators: proposal.space.authenticators,
          strategies: proposal.strategies,
          strategiesIndicies: proposal.strategies_indicies,
          connectorType,
          isContract
        });

      const strategiesWithMetadata = await Promise.all(
        strategies.map(async strategy => {
          const metadataIndex = proposal.strategies_indicies.indexOf(
            strategy.index
          );

          const metadata = await parseStrategyMetadata(
            proposal.space.strategies_parsed_metadata[metadataIndex].payload
          );

          return {
            ...strategy,
            metadata
          };
        })
      );

      let pinned: { cid: string; provider: string } | null = null;
      if (reason) pinned = await helpers.pin({ reason });

      const data = {
        space: proposal.space.id,
        authenticator,
        strategies: strategiesWithMetadata,
        proposal: proposal.proposal_id as number,
        choice: getSdkChoice(choice),
        metadataUri: pinned ? `ipfs://${pinned.cid}` : '',
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
      await executionCall('eth', chainId, 'finalizeProposal', {
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
        proposal.execution_destination,
        convertToMetaTransactions(proposal.executions[0].transactions)
      );

      return executionCall('eth', chainId, 'execute', {
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
        proposal.execution_destination,
        convertToMetaTransactions(proposal.executions[0].transactions)
      );

      return executionCall('eth', chainId, 'executeQueuedProposal', {
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
    setVotingDelay: async (
      web3: Web3Provider,
      space: Space,
      votingDelay: number
    ) => {
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
    setMinVotingDuration: async (
      web3: Web3Provider,
      space: Space,
      minVotingDuration: number
    ) => {
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
    setMaxVotingDuration: async (
      web3: Web3Provider,
      space: Space,
      maxVotingDuration: number
    ) => {
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
    transferOwnership: async (
      web3: Web3Provider,
      space: Space,
      owner: string
    ) => {
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
      delegationType: DelegationType,
      delegatee: string,
      delegationContract: string,
      chainIdOverride?: ChainId
    ) => {
      if (typeof chainIdOverride === 'string') {
        throw new Error('Chain ID must be a number for EVM networks');
      }

      const currentChainId = chainIdOverride || chainId;
      await verifyNetwork(web3, currentChainId);

      let contractParams: {
        address: string;
        functionName: string;
        functionParams: any[];
        abi: string[];
      };

      if (delegationType === 'governor-subgraph') {
        contractParams = {
          address: delegationContract.split(':')[1],
          functionName: 'delegate',
          functionParams: [delegatee],
          abi: ['function delegate(address delegatee)']
        };
      } else if (delegationType == 'delegate-registry') {
        contractParams = {
          address: '0x469788fE6E9E9681C6ebF3bF78e7Fd26Fc015446',
          functionName: 'setDelegate',
          functionParams: [formatBytes32String(space.id), delegatee],
          abi: ['function setDelegate(bytes32 id, address delegate)']
        };
      } else {
        throw new Error('Unsupported delegation type');
      }

      const votesContract = new Contract(
        contractParams.address,
        contractParams.abi,
        web3.getSigner()
      );

      return votesContract[contractParams.functionName](
        ...contractParams.functionParams
      );
    },
    updateSettings: async (
      web3: any,
      space: Space,
      metadata: SpaceMetadata,
      authenticatorsToAdd: StrategyConfig[],
      authenticatorsToRemove: number[],
      votingStrategiesToAdd: StrategyConfig[],
      votingStrategiesToRemove: number[],
      validationStrategy: StrategyConfig,
      votingDelay: number | null,
      minVotingDuration: number | null,
      maxVotingDuration: number | null
    ) => {
      await verifyNetwork(web3, chainId);

      const pinned = await helpers.pin(
        createErc1155Metadata(metadata, {
          execution_strategies: space.executors,
          execution_strategies_types: space.executors_types,
          execution_destinations: space.executors_destinations
        })
      );

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
          metadataUri: `ipfs://${pinned.cid}`,
          authenticatorsToAdd: authenticatorsToAdd.map(
            config => config.address
          ),
          authenticatorsToRemove: space.authenticators.filter(
            (authenticator, index) => authenticatorsToRemove.includes(index)
          ),
          votingStrategiesToAdd: votingStrategiesToAdd.map(config => ({
            addr: config.address,
            params: config.generateParams
              ? config.generateParams(config.params)[0]
              : '0x'
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
          proposalValidationStrategyMetadataUri,
          votingDelay: votingDelay !== null ? votingDelay : undefined,
          minVotingDuration:
            minVotingDuration !== null ? minVotingDuration : undefined,
          maxVotingDuration:
            maxVotingDuration !== null ? maxVotingDuration : undefined
        }
      });
    },
    updateSettingsRaw: () => {
      throw new Error('Not implemented');
    },
    deleteSpace: () => {
      throw new Error('Not implemented');
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
      if (snapshotInfo.at === null)
        throw new Error('EVM requires block number to be defined');

      return Promise.all(
        strategiesAddresses.map(async (address, i) => {
          const strategy = getEvmStrategy(address, networkConfig);
          if (!strategy)
            return { address, value: 0n, decimals: 0, token: null, symbol: '' };

          const strategyMetadata = await parseStrategyMetadata(
            strategiesMetadata[i].payload
          );

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
    },
    followSpace: () => {},
    unfollowSpace: () => {},
    updateUser: () => {},
    updateStatement: () => {},
    setAlias: () => {}
  };
}
