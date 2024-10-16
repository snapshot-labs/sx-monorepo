import {
  clients,
  getStarknetStrategy,
  NetworkConfig,
  starknetMainnet,
  starknetSepolia
} from '@snapshot-labs/sx';
import {
  Account,
  AllowArray,
  Call,
  CallData,
  RpcProvider,
  constants as starknetConstants
} from 'starknet';
import { executionCall, MANA_URL } from '@/helpers/mana';
import { getProvider } from '@/helpers/provider';
import { convertToMetaTransactions } from '@/helpers/transactions';
import {
  createErc1155Metadata,
  verifyNetwork,
  verifyStarknetNetwork
} from '@/helpers/utils';
import {
  EVM_CONNECTORS,
  STARKNET_CONNECTORS
} from '@/networks/common/constants';
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
  Choice,
  DelegationType,
  NetworkID,
  Proposal,
  Space,
  SpaceMetadata,
  StrategyParsedMetadata,
  VoteType
} from '@/types';

const CONFIGS: Partial<Record<NetworkID, NetworkConfig>> = {
  sn: starknetMainnet,
  'sn-sep': starknetSepolia
};

export function createActions(
  networkId: NetworkID,
  starkProvider: RpcProvider,
  helpers: NetworkHelpers,
  {
    chainId,
    l1ChainId,
    ethUrl
  }: {
    chainId: starknetConstants.StarknetChainId;
    l1ChainId: number;
    ethUrl: string;
  }
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
      return client.predictSpaceAddress({
        account: web3.provider.account,
        saltNonce: salt
      });
    },
    deployDependency: async (
      web3: any,
      params: {
        controller: string;
        spaceAddress: string;
        strategy: StrategyConfig;
      }
    ) => {
      await verifyStarknetNetwork(web3, chainId);

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
      await verifyStarknetNetwork(web3, chainId);

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

      return client.deploySpace({
        account: web3.provider.account,
        saltNonce: salt,
        params: {
          ...params,
          proposalValidationStrategy: {
            addr: params.validationStrategy.address,
            params: params.validationStrategy.generateParams
              ? params.validationStrategy.generateParams(
                  params.validationStrategy.params
                )
              : []
          },
          proposalValidationStrategyMetadataUri,
          metadataUri: `ipfs://${pinned.cid}`,
          daoUri: '',
          authenticators: params.authenticators.map(config => config.address),
          votingStrategies: params.votingStrategies.map(config => ({
            addr: config.address,
            params: config.generateParams
              ? config.generateParams(config.params)
              : []
          })),
          votingStrategiesMetadata: metadataUris
        }
      });
    },
    setMetadata: async (web3: any, space: Space, metadata: SpaceMetadata) => {
      await verifyStarknetNetwork(web3, chainId);

      const pinned = await helpers.pin(
        createErc1155Metadata(metadata, {
          execution_strategies: space.executors,
          execution_strategies_types: space.executors_types,
          execution_destinations: space.executors_destinations
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
      title: string,
      body: string,
      discussion: string,
      type: VoteType,
      choices: string[],
      labels: string[],
      executions: ExecutionInfo[] | null
    ) => {
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

      const isContract = await getIsContract(connectorType, account);

      const { relayerType, authenticator, strategies } =
        pickAuthenticatorAndStrategies({
          authenticators: space.authenticators,
          strategies: space.voting_power_validation_strategy_strategies,
          strategiesIndicies:
            space.voting_power_validation_strategy_strategies.map((_, i) => i),
          connectorType,
          isContract
        });

      if (relayerType && ['evm', 'evm-tx'].includes(relayerType)) {
        await verifyNetwork(web3, l1ChainId);
      } else {
        await verifyStarknetNetwork(web3, chainId);
      }

      let selectedExecutionStrategy;
      if (executionInfo) {
        selectedExecutionStrategy = {
          addr: executionInfo.strategyAddress,
          params: getExecutionData(
            space,
            executionInfo.strategyAddress,
            executionInfo.destinationAddress,
            convertToMetaTransactions(executionInfo.transactions)
          ).executionParams
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
        return ethTxClient.initializePropose(web3.getSigner(), data, {
          noWait: isContract
        });
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
      title: string,
      body: string,
      discussion: string,
      type: VoteType,
      choices: string[],
      labels: string[],
      executions: ExecutionInfo[] | null
    ) {
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

      const isContract = await getIsContract(connectorType, account);

      const { relayerType, authenticator } = pickAuthenticatorAndStrategies({
        authenticators: space.authenticators,
        strategies: space.voting_power_validation_strategy_strategies,
        strategiesIndicies:
          space.voting_power_validation_strategy_strategies.map((_, i) => i),
        connectorType,
        isContract
      });

      if (relayerType && ['evm', 'evm-tx'].includes(relayerType)) {
        await verifyNetwork(web3, l1ChainId);
      } else {
        await verifyStarknetNetwork(web3, chainId);
      }

      let selectedExecutionStrategy;
      if (executionInfo) {
        selectedExecutionStrategy = {
          addr: executionInfo.strategyAddress,
          params: getExecutionData(
            space,
            executionInfo.strategyAddress,
            executionInfo.destinationAddress,
            convertToMetaTransactions(executionInfo.transactions)
          ).executionParams
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
        metadataUri: `ipfs://${pinned.cid}`
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
        return ethTxClient.initializeUpdateProposal(web3.getSigner(), data, {
          noWait: isContract
        });
      }

      return client.updateProposal(web3.provider.account, {
        data
      });
    },
    cancelProposal: async (web3: any, proposal: Proposal) => {
      await verifyStarknetNetwork(web3, chainId);

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
      choice: Choice,
      reason: string
    ) => {
      const isContract = await getIsContract(connectorType, account);

      const { relayerType, authenticator, strategies } =
        pickAuthenticatorAndStrategies({
          authenticators: proposal.space.authenticators,
          strategies: proposal.strategies,
          strategiesIndicies: proposal.strategies_indicies,
          connectorType,
          isContract
        });

      if (relayerType && ['evm', 'evm-tx'].includes(relayerType)) {
        await verifyNetwork(web3, l1ChainId);
      } else {
        await verifyStarknetNetwork(web3, chainId);
      }

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
        metadataUri: pinned ? `ipfs://${pinned.cid}` : ''
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
        return ethTxClient.initializeVote(web3.getSigner(), data, {
          noWait: isContract
        });
      }

      return client.vote(web3.provider.account, {
        data
      });
    },
    finalizeProposal: () => null,
    executeTransactions: async (web3: any, proposal: Proposal) => {
      await verifyStarknetNetwork(web3, chainId);

      const executionData = getExecutionData(
        proposal.space,
        proposal.execution_strategy,
        proposal.execution_destination,
        convertToMetaTransactions(proposal.executions[0].transactions)
      );

      return executionCall('stark', chainId as string, 'execute', {
        space: proposal.space.id,
        proposalId: proposal.proposal_id,
        executionParams: executionData.executionParams
      });
    },
    executeQueuedProposal: async (web3: any, proposal: Proposal) => {
      await verifyStarknetNetwork(web3, chainId);

      if (!proposal.execution_destination)
        throw new Error('Execution destination is missing');

      const activeVotingStrategies = proposal.strategies_indicies.reduce(
        (acc, index) => {
          return acc | (1 << index);
        },
        0
      );

      const proposalData = {
        startTimestamp: proposal.start,
        minEndTimestamp: proposal.min_end,
        maxEndTimestamp: proposal.max_end,
        finalizationStatus: 0,
        executionPayloadHash: proposal.execution_hash,
        executionStrategy: proposal.execution_strategy,
        authorAddressType: proposal.author.address_type,
        author: proposal.author.id,
        activeVotingStrategies: activeVotingStrategies
      } as const;

      const votesFor = proposal.scores[0];
      const votesAgainst = proposal.scores[1];
      const votesAbstain = proposal.scores[2];

      const { executionParams } = getExecutionData(
        proposal.space,
        proposal.execution_strategy,
        proposal.execution_destination,
        convertToMetaTransactions(proposal.executions[0].transactions)
      );

      const executionHash = `${executionParams[2]}${executionParams[1].slice(2)}`;

      return executionCall('eth', l1ChainId, 'executeStarknetProposal', {
        space: proposal.space.id,
        executor: proposal.execution_destination,
        proposalId: proposal.proposal_id as number,
        proposal: proposalData,
        votesFor,
        votesAgainst,
        votesAbstain,
        executionHash,
        transactions: convertToMetaTransactions(
          proposal.executions[0].transactions
        ).map(tx => ({
          ...tx,
          salt: tx.salt.toString()
        }))
      });
    },
    vetoProposal: () => null,
    setVotingDelay: async (web3: any, space: Space, votingDelay: number) => {
      await verifyStarknetNetwork(web3, chainId);

      return client.setVotingDelay({
        signer: web3.provider.account,
        space: space.id,
        votingDelay
      });
    },
    setMinVotingDuration: async (
      web3: any,
      space: Space,
      minVotingDuration: number
    ) => {
      await verifyStarknetNetwork(web3, chainId);

      return client.setMinVotingDuration({
        signer: web3.provider.account,
        space: space.id,
        minVotingDuration
      });
    },
    setMaxVotingDuration: async (
      web3: any,
      space: Space,
      maxVotingDuration: number
    ) => {
      await verifyStarknetNetwork(web3, chainId);

      return client.setMaxVotingDuration({
        signer: web3.provider.account,
        space: space.id,
        maxVotingDuration
      });
    },
    transferOwnership: async (web3: any, space: Space, owner: string) => {
      await verifyStarknetNetwork(web3, chainId);

      return client.transferOwnership({
        signer: web3.provider.account,
        space: space.id,
        owner
      });
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
      await verifyStarknetNetwork(web3, chainId);

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
        signer: web3.provider.account,
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
              ? config.generateParams(config.params)
              : []
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
          proposalValidationStrategyMetadataUri,
          votingDelay: votingDelay !== null ? votingDelay : undefined,
          minVotingDuration:
            minVotingDuration !== null ? minVotingDuration : undefined,
          maxVotingDuration:
            maxVotingDuration !== null ? maxVotingDuration : undefined
        }
      });
    },
    delegate: async (
      web3: any,
      space: Space,
      networkId: NetworkID,
      delegationType: DelegationType,
      delegatee: string,
      delegationContract: string
    ) => {
      await verifyStarknetNetwork(web3, chainId);

      const [, contractAddress] = delegationContract.split(':');

      const { account }: { account: Account } = web3.provider;

      let calls: AllowArray<Call> = {
        contractAddress,
        entrypoint: 'delegate',
        calldata: CallData.compile({ delegatee })
      };

      // Temporary fix for NSTR to delegate for 2 tokens at once
      if (
        networkId === 'sn' &&
        [
          '0x0395989740c1d6ecc0cba880dd22e87cc209fdb6b8dc2794e9a399c4b2c34d94',
          '0x07c251045154318a2376a3bb65be47d3c90df1740d8e35c9b9d943aa3f240e50'
        ].includes(space.id)
      ) {
        calls = [
          '0x00c530f2c0aa4c16a0806365b0898499fba372e5df7a7172dc6fe9ba777e8007',
          '0x02589fc11f60f21af6a1dda3aeb7a44305c552928af122f2834d1c3b1a7aa626',
          '0x046ab56ec0c6a6d42384251c97e9331aa75eb693e05ed8823e2df4de5713e9a4',
          '0x02b674ffda238279de5550d6f996bf717228d316555f07a77ef0a082d925b782',
          '0x06f8ad459c712873993e9ffb9013a469248343c3d361e4d91a8cac6f98575834'
        ].map(contractAddress => ({
          contractAddress,
          entrypoint: 'delegate',
          calldata: CallData.compile({ delegatee })
        }));
      }

      return account.execute(calls);
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
          if (!strategy)
            return { address, value: 0n, decimals: 0, token: null, symbol: '' };

          const strategyMetadata = await parseStrategyMetadata(
            strategiesMetadata[i].payload
          );

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
    followSpace: () => {},
    unfollowSpace: () => {},
    setAlias: async (web3: any, alias: string) => {
      await verifyStarknetNetwork(web3, chainId);

      return starkSigClient.setAlias({
        signer: web3.provider.account,
        data: { alias }
      });
    },
    updateUser: () => {},
    updateStatement: () => {},
    updateSettingsRaw: () => {
      throw new Error('Not implemented');
    },
    deleteSpace: () => {
      throw new Error('Not implemented');
    },
    send: (envelope: any) => starkSigClient.send(envelope) // TODO: extract it out of client to common helper
  };
}
