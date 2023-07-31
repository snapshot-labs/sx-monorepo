import {
  clients as Clients,
  getExecutionData,
  defaultNetwork,
  clients,
  getStarknetStrategy
} from '@snapshot-labs/sx';
import { SUPPORTED_AUTHENTICATORS, SUPPORTED_EXECUTORS, SUPPORTED_STRATEGIES } from './constants';
import { createErc1155Metadata, verifyNetwork } from '@/helpers/utils';
import { convertToMetaTransactions } from '@/helpers/transactions';
import type { Provider } from 'starknet';
import type { Web3Provider } from '@ethersproject/providers';
import type { MetaTransaction } from '@snapshot-labs/sx/dist/utils/encoding/execution-hash';
import type { NetworkActions, NetworkHelpers, StrategyConfig, VotingPower } from '@/networks/types';
import type { Space, SpaceMetadata, StrategyParsedMetadata, Proposal } from '@/types';

const VANILLA_EXECUTOR = '0x4ecc83848a519cc22b0d0ffb70e65ec8dde85d3d13439eff7145d4063cf6b4d';
const ZODIAC_EXECUTOR = '0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81';

function buildExecution(space: Space, transactions: MetaTransaction[]) {
  if (space.executors.find(executor => executor === ZODIAC_EXECUTOR)) {
    return getExecutionData(ZODIAC_EXECUTOR, defaultNetwork, { transactions });
  }

  if (space.executors.find(executor => executor === VANILLA_EXECUTOR)) {
    if (transactions.length) {
      console.warn('transactions will be ignored as vanilla executor is used');
    }

    return {
      executor: VANILLA_EXECUTOR,
      executionParams: []
    };
  }

  throw new Error('No supported executor configured for this space');
}

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

export function createActions(
  starkProvider: Provider,
  helpers: NetworkHelpers,
  { l1ChainId }: { l1ChainId: number }
): NetworkActions {
  const manaUrl: string = import.meta.env.VITE_MANA_URL || 'http://localhost:3000';
  const ethUrl: string = import.meta.env.VITE_ETH_RPC_URL;

  const clientConfig = {
    starkProvider,
    manaUrl,
    ethUrl
  };

  const client = new Clients.EthereumSig(clientConfig);

  return {
    async predictSpaceAddress() {
      return null;
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
        proposalThreshold: bigint;
        quorum: bigint;
        authenticators: StrategyConfig[];
        validationStrategy: StrategyConfig;
        votingStrategies: StrategyConfig[];
        executionStrategies: StrategyConfig[];
        metadata: SpaceMetadata;
      }
    ) {
      const spaceManager = new clients.SpaceManager({
        starkProvider,
        account: web3.provider.account,
        disableEstimation: true
      });

      const pinned = await helpers.pin(createErc1155Metadata(params.metadata));

      return spaceManager.deploySpace({
        ...params,
        authenticators: params.authenticators.map(config => config.address),
        votingStrategies: params.votingStrategies.map(strategy => strategy.address),
        votingStrategiesParams: params.votingStrategies.map(strategy =>
          strategy.generateParams ? strategy.generateParams(strategy.params) : []
        ),
        executionStrategies: params.executionStrategies.map(strategy => strategy.address),
        metadataUri: `ipfs://${pinned.cid}`
      });
    },
    setMetadata: async (web3: any, space: Space, metadata: SpaceMetadata) => {
      const spaceManager = new clients.SpaceManager({
        starkProvider,
        account: web3.provider.account,
        disableEstimation: true
      });

      const pinned = await helpers.pin(createErc1155Metadata(metadata));

      return spaceManager.setMetadataUri(space.id, `ipfs://${pinned.cid}`);
    },
    propose: async (
      web3: Web3Provider,
      account: string,
      space: Space,
      cid: string,
      executionStrategy: string | null,
      transactions: MetaTransaction[]
    ) => {
      await verifyNetwork(web3, l1ChainId);

      const { authenticator, strategies } = pickAuthenticatorAndStrategies(
        space.authenticators,
        space.strategies
      );

      const executionData = buildExecution(space, transactions);

      return client.propose(web3, account, {
        space: space.id,
        authenticator,
        strategies,
        metadataUri: `ipfs://${cid}`,
        ...executionData
      });
    },
    updateProposal: () => {
      throw new Error('Not implemented');
    },
    cancelProposal: () => {
      throw new Error('Not implemented');
    },
    vote: async (web3: Web3Provider, account: string, proposal: Proposal, choice: number) => {
      await verifyNetwork(web3, l1ChainId);

      const { authenticator, strategies } = pickAuthenticatorAndStrategies(
        proposal.space.authenticators,
        proposal.strategies
      );

      return client.vote(web3, account, {
        space: proposal.space.id,
        authenticator,
        strategies,
        proposal: proposal.proposal_id,
        choice
      });
    },
    finalizeProposal: async (web3: Web3Provider, proposal: Proposal) => {
      const res = await fetch(
        `${manaUrl}/space/${proposal.space.id}/${proposal.proposal_id}/finalize`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transactions: convertToMetaTransactions(proposal.execution)
          })
        }
      );

      const { error, receipt } = await res.json();
      if (error) throw new Error('Finalization failed');

      return receipt;
    },
    receiveProposal: async (web3: Web3Provider, proposal: Proposal) => {
      await verifyNetwork(web3, l1ChainId);

      const zodiac = new Clients.Zodiac({ signer: web3.getSigner() });

      const executor = proposal.space.executors.find(executor => SUPPORTED_EXECUTORS[executor]);
      if (!executor) throw new Error('Unsupported space');

      return zodiac.receiveProposal(proposal.space.id, executor, {
        transactions: convertToMetaTransactions(proposal.execution)
      });
    },
    executeTransactions: async (web3: Web3Provider, proposal: Proposal) => {
      await verifyNetwork(web3, l1ChainId);

      // TODO: make it dynamic once we have way to fetch it somehow
      const proposalIndex = 3;

      const zodiac = new Clients.Zodiac({ signer: web3.getSigner() });

      const executor = proposal.space.executors.find(executor => SUPPORTED_EXECUTORS[executor]);
      if (!executor) throw new Error('Unsupported space');

      return zodiac.executeProposalTxBatch(
        proposalIndex,
        executor,
        convertToMetaTransactions(proposal.execution)
      );
    },
    executeQueuedProposal: () => null,
    vetoProposal: () => null,
    setVotingDelay: () => null,
    setMinVotingDuration: () => null,
    setMaxVotingDuration: () => null,
    transferOwnership: () => null,
    getVotingPower: async (
      strategiesAddresses: string[],
      strategiesParams: any[],
      strategiesMetadata: StrategyParsedMetadata[],
      voterAddress: string,
      block: number
    ): Promise<VotingPower[]> => {
      const offsetsLength = parseInt(strategiesParams[0], 16);
      const offsets = strategiesParams
        .slice(1, offsetsLength + 1)
        .map(offset => parseInt(offset, 16));
      const elementsLength = strategiesParams.length - offsetsLength - 1;
      const elements = strategiesParams.slice(offsetsLength + 1);
      const params2D = offsets.map((offset, index) => {
        const last = index === offsetsLength - 1 ? elementsLength : offsets[index + 1];
        return elements.slice(offset, last);
      });

      return Promise.all(
        strategiesAddresses.map(async (address, i) => {
          const strategy = getStarknetStrategy(address, defaultNetwork);
          if (!strategy) return { address, value: 0n, decimals: 0, token: null, symbol: '' };

          const value = await strategy.getVotingPower(address, voterAddress, block, params2D[i], {
            ...clientConfig,
            networkConfig: defaultNetwork
          });

          const token = strategy.type === 'singleSlotProof' ? params2D[i][0] : null;
          return { address, value, decimals: 0, token, symbol: '' };
        })
      );
    },
    send: (envelope: any) => client.send(envelope)
  };
}
