import { Provider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import {
  clients,
  getEvmStrategy,
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
import { getExecutionData, createStrategyPicker } from '@/networks/common/helpers';
import { EVM_CONNECTORS } from '@/networks/common/constants';
import {
  CONTRACT_SUPPORTED_AUTHENTICATORS,
  RELAYER_AUTHENTICATORS,
  SUPPORTED_AUTHENTICATORS,
  SUPPORTED_STRATEGIES
} from './constants';
import type { Web3Provider } from '@ethersproject/providers';
import type {
  Connector,
  NetworkActions,
  NetworkHelpers,
  StrategyConfig,
  VotingPower
} from '@/networks/types';
import type { MetaTransaction } from '@snapshot-labs/sx/dist/utils/encoding/execution-hash';
import type { Space, Proposal, SpaceMetadata, StrategyParsedMetadata, NetworkID } from '@/types';

type Choice = 0 | 1 | 2;

const CONFIGS: Record<number, EvmNetworkConfig> = {
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
    supportedAuthenticators: SUPPORTED_AUTHENTICATORS,
    supportedStrategies: SUPPORTED_STRATEGIES,
    contractSupportedAuthenticators: CONTRACT_SUPPORTED_AUTHENTICATORS,
    relayerAuthenticators: RELAYER_AUTHENTICATORS,
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
        params.votingStrategies.map(async config => {
          if (!config.generateMetadata) return '';

          const metadata = await config.generateMetadata(config.params);
          const pinned = await helpers.pin(metadata);

          return `ipfs://${pinned.cid}`;
        })
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
          proposalValidationStrategyMetadataUri: '',
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
        authenticator,
        strategies,
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
      proposalId: number,
      cid: string,
      executionStrategy: string | null,
      transactions: MetaTransaction[]
    ) {
      await verifyNetwork(web3, chainId);

      const isContract = await getIsContract(account);

      const { relayerType, authenticator } = pickAuthenticatorAndStrategies({
        authenticators: space.authenticators,
        strategies: space.voting_power_validation_strategy_strategies,
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
        proposal: proposalId,
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
          proposal: proposal.proposal_id
        },
        { noWait: isContract }
      );
    },
    vote: async (
      web3: Web3Provider,
      connectorType: Connector,
      account: string,
      proposal: Proposal,
      choice: number
    ) => {
      await verifyNetwork(web3, chainId);

      if (choice < 1 || choice > 3) throw new Error('Invalid chocie');

      const isContract = await getIsContract(account);

      const { relayerType, authenticator, strategies } = pickAuthenticatorAndStrategies({
        authenticators: proposal.space.authenticators,
        strategies: proposal.strategies,
        connectorType,
        isContract
      });

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
    finalizeProposal: () => null,
    receiveProposal: () => null,
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
    delegate: async (web3: Web3Provider, space: Space, networkId: NetworkID, delegatee: string) => {
      if (!space.delegation_contract) throw new Error('Delegation contract missing');

      await verifyNetwork(web3, CHAIN_IDS[networkId]);

      const [, contractAddress] = space.delegation_contract.split(':');

      const votesContract = new Contract(
        contractAddress,
        ['function delegate(address delegatee)'],
        web3.getSigner()
      );

      return votesContract.delegate(delegatee);
    },
    send: (envelope: any) => ethSigClient.send(envelope),
    getVotingPower: async (
      strategiesAddresses: string[],
      strategiesParams: any[],
      strategiesMetadata: StrategyParsedMetadata[],
      voterAddress: string,
      block: number | null
    ): Promise<VotingPower[]> => {
      if (block === null) throw new Error('EVM requires block number to be defined');

      return Promise.all(
        strategiesAddresses.map(async (address, i) => {
          const strategy = getEvmStrategy(address, networkConfig);
          if (!strategy) return { address, value: 0n, decimals: 0, token: null, symbol: '' };

          const value = await strategy.getVotingPower(
            address,
            voterAddress,
            null,
            block,
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
            token
          };
        })
      );
    }
  };
}
