import { isAddress } from '@ethersproject/address';
import { hexZeroPad } from '@ethersproject/bytes';
import { Contract } from '@ethersproject/contracts';
import { Provider, Web3Provider } from '@ethersproject/providers';
import { formatBytes32String } from '@ethersproject/strings';
import {
  clients,
  evmApe,
  evmArbitrum,
  evmBase,
  evmCurtis,
  evmMainnet,
  evmMantle,
  EvmNetworkConfig,
  evmOptimism,
  evmPolygon,
  evmSepolia,
  getEvmStrategy
} from '@snapshot-labs/sx';
import { AbiCoder } from 'ethers';
import { APE_GAS_CONFIGS } from '@/helpers/constants';
import { getIsContract as _getIsContract } from '@/helpers/contracts';
import { vote as highlightVote } from '@/helpers/highlight';
import { getSwapLink } from '@/helpers/link';
import { executionCall, getRelayerInfo, MANA_URL } from '@/helpers/mana';
import Multicaller from '@/helpers/multicaller';
import { getProvider } from '@/helpers/provider';
import { convertToMetaTransactions } from '@/helpers/transactions';
import { createErc1155Metadata, verifyNetwork } from '@/helpers/utils';
import { WHITELIST_SERVER_URL } from '@/helpers/whitelistServer';
import {
  buildMetadata,
  createStrategyPicker,
  getExecutionData,
  getSdkChoice,
  parseStrategyMetadata
} from '@/networks/common/helpers';
import {
  ConnectorType,
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
  Privacy,
  Proposal,
  Space,
  SpaceMetadata,
  SpaceMetadataDelegation,
  StrategyParsedMetadata,
  VoteType
} from '@/types';

const CONFIGS: Record<number, EvmNetworkConfig> = {
  10: evmOptimism,
  137: evmPolygon,
  5000: evmMantle,
  8453: evmBase,
  42161: evmArbitrum,
  1: evmMainnet,
  33139: evmApe,
  33111: evmCurtis,
  11155111: evmSepolia
};

export function createActions(
  provider: Provider,
  helpers: NetworkHelpers,
  chainId: number
): NetworkActions {
  const networkConfig = CONFIGS[chainId];

  const pickAuthenticatorAndStrategies = createStrategyPicker({
    helpers
  });

  const clientOpts = {
    networkConfig,
    whitelistServerUrl: WHITELIST_SERVER_URL,
    provider
  };

  const client = new clients.EvmEthereumTx(clientOpts);
  const ethSigClient = new clients.EvmEthereumSig({
    ...clientOpts,
    manaUrl: MANA_URL
  });

  const getIsContract = async (
    address: string,
    connectorType: ConnectorType
  ) => {
    if (connectorType === 'sequence') {
      // NOTE: Sequence WaaS wallet is always a contract, this will save a request, but also
      // handles case where the wallet is not deployed yet (it will be deployed as part of signing flow).
      return true;
    }

    return _getIsContract(provider, address);
  };

  /**
   * Get signer from Web3 provider with ENS resolver on mainnet
   * @param web3 Web3 provider
   * @returns signer with ENS resolver on mainnet
   */
  const getSigner = (web3: Web3Provider) => {
    const signer = web3.getSigner();
    signer.provider.getResolver = (value: string) => {
      return getProvider(1).getResolver(value);
    };

    return signer;
  };

  return {
    async predictSpaceAddress(web3: Web3Provider, { salt }) {
      await verifyNetwork(web3, chainId);

      return client.predictSpaceAddress({
        signer: getSigner(web3),
        saltNonce: salt
      });
    },
    async deployDependency(
      web3: Web3Provider,
      connectorType: ConnectorType,
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
      web3: Web3Provider,
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
        signer: getSigner(web3),
        saltNonce: salt,
        params: {
          ...params,
          authenticators: params.authenticators.map(config => config.address),
          votingStrategies: await Promise.all(
            params.votingStrategies.map(async config => ({
              addr: config.address,
              params: config.generateParams
                ? (await config.generateParams(config.params))[0]
                : '0x'
            }))
          ),
          votingStrategiesMetadata: metadataUris,
          proposalValidationStrategy: {
            addr: params.validationStrategy.address,
            params: params.validationStrategy.generateParams
              ? (
                  await params.validationStrategy.generateParams(
                    params.validationStrategy.params
                  )
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
    propose: async (
      web3: Web3Provider,
      connectorType: ConnectorType,
      account: string,
      space: Space,
      title: string,
      body: string,
      discussion: string,
      type: VoteType,
      choices: string[],
      privacy: Privacy,
      labels: string[],
      app: string,
      created: number,
      start: number,
      min_end: number,
      max_end: number
      // executions: ExecutionInfo[] | null
    ) => {
      await verifyNetwork(web3, chainId);

      // Load deployed addresses for this space from localStorage
      const data = localStorage.getItem('deployedContracts');
      let matchAddress = space.id;
      if (matchAddress.startsWith('s:')) matchAddress = matchAddress.slice(2);
      let deployedAddresses: {
        spaceContract: string;
        vanillaAuthenticator: string;
        vanillaExecutionStrategy: string;
        vanillaProposalValidationStrategy: string;
        vanillaVotingStrategy: string;
      } | null = null;
      if (data) {
        const spaces = JSON.parse(data);
        const found = spaces.find(s => s.spaceContractAddress === matchAddress);
        if (!found)
          throw new Error(
            `No deployed contract info found for this space address: ${matchAddress}`
          );
        deployedAddresses = {
          spaceContract: found.spaceContractAddress,
          vanillaAuthenticator: found.authenticatorAddress,
          vanillaExecutionStrategy: found.executionStrategyAddress,
          vanillaProposalValidationStrategy:
            found.proposalValidationStrategyAddress,
          vanillaVotingStrategy: found.votingStrategyAddress
        };
      } else {
        throw new Error('No deployedContracts found in localStorage');
      }
      if (!deployedAddresses) {
        throw new Error('deployedAddresses is null');
      }

      const data2propose = {
        author: account,
        metadataURI: '',
        executionStrategy: {
          addr: deployedAddresses.vanillaExecutionStrategy,
          params: '0x'
        },
        userProposalValidationParams: '0x'
      };

      const abiCoder = new AbiCoder();
      const encodedData = abiCoder.encode(
        ['address', 'string', '(address,bytes)', 'bytes'],
        [
          data2propose.author,
          data2propose.metadataURI,
          [
            data2propose.executionStrategy.addr,
            data2propose.executionStrategy.params
          ],
          data2propose.userProposalValidationParams
        ]
      );

      const signer = getSigner(web3);

      const spaceContract = new Contract(
        deployedAddresses.spaceContract,
        ['function nextProposalId() view returns (uint256)'],
        signer
      );
      const ggp = await spaceContract.nextProposalId();

      // Create proposal
      const authenticatorContract = new Contract(
        deployedAddresses.vanillaAuthenticator,
        [
          'function authenticate(address space, bytes4 selector, bytes calldata data)'
        ],
        signer
      );

      const tx = await authenticatorContract.authenticate(
        deployedAddresses.spaceContract,
        '0xaad83f3b',
        encodedData
      );

      await tx.wait();

      const localKey = `localProposals:${deployedAddresses.spaceContract}`;
      const localProposals = JSON.parse(localStorage.getItem(localKey) || '[]');

      // Helper function to ensure timestamp is in seconds
      const ensureSeconds = (timestamp: number) => {
        // If timestamp is in milliseconds (13+ digits), convert to seconds
        return timestamp > 9999999999
          ? Math.floor(timestamp / 1000)
          : timestamp;
      };

      const newProposal = {
        id: `local-${Date.now()}`,
        title,
        body,
        ggp: Number(ggp),
        discussion,
        choices,
        created: Math.floor(Date.now() / 1000),
        author: {
          id: account,
          name: '',
          role: null,
          address_type: 0
        },
        state: 'pending',
        network: space.network,
        space: {
          id: deployedAddresses.spaceContract,
          name: space?.name || '',
          avatar: space?.avatar || '',
          network: space.network,
          admins: (space as any)?.admins || [],
          moderators: (space as any)?.moderators || [],
          controller: space?.controller || '',
          strategies_parsed_metadata: [],
          terms: space?.terms || '',
          voting_power_symbol: space?.voting_power_symbol || '',
          authenticators: space?.authenticators || [],
          executors: space?.executors || [],
          executors_types: space?.executors_types || [],
          labels: space?.labels || []
        },
        proposal_id: '',
        execution_network: space.network,
        isInvalid: false,
        type,
        quorum: 0,
        quorum_type: 'default',
        execution_hash: '',
        metadata_uri: '',
        executions: [],
        start: ensureSeconds(start || Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
        min_end: ensureSeconds(min_end || Math.floor(Date.now() / 1000) + 7200), // 2 hours from now
        max_end: ensureSeconds(max_end || Math.floor(Date.now() / 1000) + 7200), // 2 hours from now
        snapshot: 0,
        labels: labels || [],
        scores: [],
        scores_total: 0,
        execution_time: 0,
        execution_strategy: '',
        execution_strategy_type: '',
        execution_destination: null,
        timelock_veto_guardian: null,
        strategies_indices: [],
        strategies: [],
        strategies_params: [],
        edited: null,
        tx: '',
        execution_tx: null,
        veto_tx: null,
        vote_count: 0,
        has_execution_window_opened: false,
        execution_ready: false,
        vetoed: false,
        completed: false,
        cancelled: false,
        privacy: privacy || 'none',
        flagged: false
      };
      localProposals.push(newProposal);
      localStorage.setItem(localKey, JSON.stringify(localProposals));

      return { txId: tx.hash };
    },
    async updateProposal(
      web3: Web3Provider,
      connectorType: ConnectorType,
      account: string,
      space: Space,
      proposalId: Proposal,
      title: string,
      body: string,
      discussion: string,
      type: VoteType,
      choices: string[],
      privacy: Privacy,
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
        labels,
        execution: executionInfo?.transactions ?? []
      });
      if (!pinned || !pinned.cid) return false;
      console.log('IPFS', pinned);

      const isContract = await getIsContract(account, connectorType);

      const relayer = await getRelayerInfo(space.id, space.network, provider);

      const { relayerType, authenticator } = pickAuthenticatorAndStrategies({
        authenticators: space.authenticators,
        strategies: space.voting_power_validation_strategy_strategies,
        strategiesIndices:
          space.voting_power_validation_strategy_strategies.map((_, i) => i),
        connectorType,
        isContract,
        ignoreRelayer: !relayer?.hasMinimumBalance
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
        proposal: proposalId.proposal_id as number,
        authenticator,
        executionStrategy: selectedExecutionStrategy,
        metadataUri: `ipfs://${pinned.cid}`
      };

      const signer = getSigner(web3);

      if (relayerType === 'evm') {
        return ethSigClient.updateProposal({
          signer,
          data
        });
      }

      return client.updateProposal(
        {
          signer,
          envelope: {
            data
          }
        },
        { noWait: isContract && connectorType !== 'sequence' }
      );
    },
    flagProposal: () => {
      throw new Error('Not implemented');
    },
    cancelProposal: async (
      web3: Web3Provider,
      connectorType: ConnectorType,
      account: string,
      proposal: Proposal
    ) => {
      await verifyNetwork(web3, chainId);

      const signer = getSigner(web3);

      const address = await signer.getAddress();
      const isContract = await getIsContract(address, connectorType);

      return client.cancel(
        {
          signer,
          space: proposal.space.id,
          proposal: proposal.proposal_id as number
        },
        { noWait: isContract && connectorType !== 'sequence' }
      );
    },
    vote: async (
      web3: Web3Provider,
      connectorType: ConnectorType,
      account: string,
      proposal: Proposal,
      choice: Choice,
      reason: string
    ) => {
      await verifyNetwork(web3, chainId);

      const isContract = await getIsContract(account, connectorType);

      const relayer = await getRelayerInfo(
        proposal.space.id,
        proposal.network,
        provider
      );

      const { relayerType, authenticator, strategies } =
        pickAuthenticatorAndStrategies({
          authenticators: proposal.space.authenticators,
          strategies: proposal.strategies,
          strategiesIndices: proposal.strategies_indices,
          connectorType,
          isContract,
          ignoreRelayer: !relayer?.hasMinimumBalance
        });

      const strategiesWithMetadata = await Promise.all(
        strategies.map(async strategy => {
          const metadataIndex = proposal.strategies_indices.indexOf(
            strategy.index
          );

          const params = proposal.strategies_params[strategy.paramsIndex];
          const metadata = await parseStrategyMetadata(
            proposal.space.strategies_parsed_metadata[metadataIndex].payload
          );

          return {
            ...strategy,
            params,
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

      const signer = getSigner(web3);

      if (!isContract && proposal.execution_strategy_type === 'Axiom') {
        return highlightVote({ signer, data });
      }

      if (relayerType === 'evm') {
        return ethSigClient.vote({
          signer,
          data
        });
      }

      return client.vote(
        {
          signer,
          envelope: {
            data
          }
        },
        { noWait: isContract && connectorType !== 'sequence' }
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
        signer: getSigner(web3),
        executionStrategy: proposal.execution_strategy,
        executionHash: proposal.execution_hash
      });
    },
    transferOwnership: async (
      web3: Web3Provider,
      connectorType: ConnectorType,
      space: Space,
      owner: string
    ) => {
      await verifyNetwork(web3, chainId);

      const signer = web3.getSigner();

      const address = await signer.getAddress();
      const isContract = await getIsContract(address, connectorType);

      return client.transferOwnership(
        {
          signer,
          space: space.id,
          owner
        },
        { noWait: isContract && connectorType !== 'sequence' }
      );
    },
    delegate: async (
      web3: Web3Provider,
      space: Space,
      networkId: NetworkID,
      delegationType: DelegationType,
      delegatees: string[],
      delegationContract: string,
      chainIdOverride?: ChainId,
      delegateesMetadata?: Record<string, any>
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
        const delegatee =
          delegatees[0] ?? '0x0000000000000000000000000000000000000000';

        contractParams = {
          address: delegationContract,
          functionName: 'delegate',
          functionParams: [delegatee],
          abi: ['function delegate(address delegatee)']
        };
      } else if (
        delegationType === 'delegate-registry' ||
        delegationType === 'apechain-delegate-registry'
      ) {
        const contractAddress =
          delegationType === 'delegate-registry'
            ? '0x469788fE6E9E9681C6ebF3bF78e7Fd26Fc015446'
            : APE_GAS_CONFIGS[currentChainId].registryContract;

        const delegationId =
          delegationType === 'delegate-registry'
            ? formatBytes32String(space.id)
            : delegationContract;

        if (delegatees[0]) {
          contractParams = {
            address: contractAddress,
            functionName: 'setDelegate',
            functionParams: [delegationId, delegatees[0]],
            abi: ['function setDelegate(bytes32 id, address delegate)']
          };
        } else {
          contractParams = {
            address: contractAddress,
            functionName: 'clearDelegate',
            functionParams: [delegationId],
            abi: ['function clearDelegate(bytes32 id)']
          };
        }
      } else if (delegationType === 'split-delegation') {
        if (!delegateesMetadata?.expirationDate) {
          throw new Error('Expiration is required for split delegation');
        }

        if (delegateesMetadata?.shares?.length !== delegatees.length) {
          throw new Error('Matching shares are required for split delegation');
        }

        if (delegatees.length) {
          const delegations = delegatees
            .map((address, index) => ({
              delegate: hexZeroPad(address, 32),
              ratio: delegateesMetadata.shares[index]
            }))
            .sort((a, b) => {
              return BigInt(a.delegate) < BigInt(b.delegate) ? -1 : 1;
            });
          contractParams = {
            address: delegationContract,
            functionName: 'setDelegation',
            functionParams: [
              space.id,
              delegations,
              delegateesMetadata.expirationDate
            ],
            abi: [
              'function setDelegation(string context, tuple(bytes32 delegate, uint256 ratio)[] delegation, uint256 expirationTimestamp)'
            ]
          };
        } else {
          contractParams = {
            address: delegationContract,
            functionName: 'clearDelegation',
            functionParams: [space.id],
            abi: ['function clearDelegation(string context)']
          };
        }
      } else {
        throw new Error('Unsupported delegation type');
      }

      const signer = getSigner(web3);

      const votesContract = new Contract(
        contractParams.address,
        contractParams.abi,
        signer
      );

      return votesContract[contractParams.functionName](
        ...contractParams.functionParams
      );
    },
    getDelegatee: async (
      delegation: SpaceMetadataDelegation,
      delegator: string
    ) => {
      const { contractAddress } = delegation;
      if (!contractAddress || !delegation.chainId || !isAddress(delegator))
        return null;

      const multi = new Multicaller(
        delegation.chainId.toString(),
        getProvider(delegation.chainId as number),
        [
          'function decimals() view returns (uint8)',
          'function balanceOf(address account) view returns (uint256)',
          'function delegates(address) view returns (address)'
        ]
      );
      multi.call('decimals', contractAddress, 'decimals');
      multi.call('balanceOf', contractAddress, 'balanceOf', [delegator]);
      multi.call('delegatee', contractAddress, 'delegates', [delegator]);

      const { decimals, balanceOf, delegatee } = await multi.execute();

      return delegatee !== '0x0000000000000000000000000000000000000000'
        ? { address: delegatee, balance: balanceOf.toBigInt(), decimals }
        : null;
    },
    updateSettings: async (
      web3: Web3Provider,
      connectorType: ConnectorType,
      space: Space,
      metadata: SpaceMetadata,
      authenticatorsToAdd: StrategyConfig[],
      authenticatorsToRemove: number[],
      votingStrategiesToAdd: StrategyConfig[],
      votingStrategiesToRemove: number[],
      validationStrategy: StrategyConfig,
      executionStrategies: StrategyConfig[],
      votingDelay: number | null,
      minVotingDuration: number | null,
      maxVotingDuration: number | null
    ) => {
      await verifyNetwork(web3, chainId);

      const address = await web3.getSigner().getAddress();
      const isContract = await getIsContract(address, connectorType);

      const pinned = await helpers.pin(
        createErc1155Metadata(metadata, {
          execution_strategies: executionStrategies.map(
            config => config.address
          ),
          execution_strategies_types: executionStrategies.map(
            config => config.type
          ),
          execution_destinations: executionStrategies.map(
            (_, i) => space.executors_destinations[i] ?? ''
          )
        })
      );

      const metadataUris = await Promise.all(
        votingStrategiesToAdd.map(config => buildMetadata(helpers, config))
      );

      const proposalValidationStrategyMetadataUri = await buildMetadata(
        helpers,
        validationStrategy
      );

      return client.updateSettings(
        {
          signer: getSigner(web3),
          space: space.id,
          settings: {
            metadataUri: `ipfs://${pinned.cid}`,
            authenticatorsToAdd: authenticatorsToAdd.map(
              config => config.address
            ),
            authenticatorsToRemove: space.authenticators.filter(
              (authenticator, index) => authenticatorsToRemove.includes(index)
            ),
            votingStrategiesToAdd: await Promise.all(
              votingStrategiesToAdd.map(async config => ({
                addr: config.address,
                params: config.generateParams
                  ? (await config.generateParams(config.params))[0]
                  : '0x'
              }))
            ),
            votingStrategiesToRemove: votingStrategiesToRemove.map(
              index => space.strategies_indices[index]
            ),
            votingStrategyMetadataUrisToAdd: metadataUris,
            proposalValidationStrategy: {
              addr: validationStrategy.address,
              params: validationStrategy.generateParams
                ? (
                    await validationStrategy.generateParams(
                      validationStrategy.params
                    )
                  )[0]
                : '0x'
            },
            proposalValidationStrategyMetadataUri,
            votingDelay: votingDelay !== null ? votingDelay : undefined,
            minVotingDuration:
              minVotingDuration !== null ? minVotingDuration : undefined,
            maxVotingDuration:
              maxVotingDuration !== null ? maxVotingDuration : undefined
          }
        },
        { noWait: isContract && connectorType !== 'sequence' }
      );
    },
    updateSettingsRaw: () => {
      throw new Error('Not implemented');
    },
    createSpaceRaw: () => {
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
      const cumulativeDecimals = Math.max(
        ...strategiesMetadata.map(metadata => metadata.decimals ?? 0)
      );

      return Promise.all(
        strategiesAddresses.map(async (address, i) => {
          const strategy = getEvmStrategy(address, networkConfig);
          if (!strategy)
            return {
              address,
              value: 0n,
              displayDecimals: 0,
              cumulativeDecimals: 0,
              token: null,
              symbol: ''
            };

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
            cumulativeDecimals,
            displayDecimals: strategiesMetadata[i]?.decimals ?? 0,
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
