import { FunctionalComponent } from 'vue';
import type { Web3Provider } from '@ethersproject/providers';
import type { Signer } from '@ethersproject/abstract-signer';
import type { MetaTransaction } from '@snapshot-labs/sx/dist/utils/encoding';
import type {
  Space,
  SpaceMetadata,
  Proposal,
  Vote,
  User,
  Choice,
  NetworkID,
  StrategyParsedMetadata
} from '@/types';

export type PaginationOpts = { limit: number; skip?: number };
export type SpacesFilter = {
  controller?: string;
  id_in?: string[];
};
export type Connector = 'argentx' | 'injected' | 'walletconnect' | 'walletlink' | 'gnosis';
export type GeneratedMetadata =
  | {
      name: string;
      description?: string;
      properties: {
        symbol?: string;
        decimals: number;
        token?: string;
        payload?: string;
      };
    }
  | {
      strategies_metadata: string[];
    };

export type StrategyTemplate = {
  address: string;
  name: string;
  about?: string;
  icon?: FunctionalComponent;
  type?: string;
  paramsDefinition: any;
  validate?: (params: Record<string, any>) => boolean;
  generateSummary?: (params: Record<string, any>) => string;
  generateParams?: (params: Record<string, any>) => any[];
  generateMetadata?: (params: Record<string, any>) => Promise<GeneratedMetadata>;
  parseParams?: (
    params: string,
    metadata: StrategyParsedMetadata | null
  ) => Promise<Record<string, any>>;
  deployConnectors?: Connector[];
  deployNetworkId?: NetworkID;
  deploy?: (
    client: any,
    signer: Signer,
    controller: string,
    spaceAddress: string,
    params: Record<string, any>
  ) => Promise<{ address: string; txId: string }>;
};

export type StrategyConfig = StrategyTemplate & {
  id: string;
  params: Record<string, any>;
};

export type SnapshotInfo = {
  at: number | null;
  chainId?: number;
};

export type VotingPower = {
  address: string;
  value: bigint;
  decimals: number;
  token: string | null;
  symbol: string;
  chainId?: number;
  swapLink?: string;
};

export type VotingPowerStatus = 'loading' | 'success' | 'error';

// TODO: make sx.js accept Signer instead of Web3Provider | Wallet

export type ReadOnlyNetworkActions = {
  getVotingPower(
    spaceId: string,
    strategiesAddresses: string[],
    strategiesParams: any[],
    strategiesMetadata: StrategyParsedMetadata[],
    voterAddress: string,
    snapshotInfo: SnapshotInfo
  ): Promise<VotingPower[]>;
  propose(
    web3: Web3Provider,
    connectorType: Connector,
    account: string,
    space: Space,
    cid: string,
    executionStrategy: string | null,
    transactions: MetaTransaction[]
  ): Promise<any>;
  updateProposal(
    web3: Web3Provider,
    connectorType: Connector,
    account: string,
    space: Space,
    proposalId: number | string,
    cid: string,
    executionStrategy: string | null,
    transactions: MetaTransaction[]
  ): Promise<any>;
  cancelProposal(web3: Web3Provider, proposal: Proposal);
  vote(
    web3: Web3Provider,
    connectorType: Connector,
    account: string,
    proposal: Proposal,
    choice: Choice
  ): Promise<any>;
  send(envelope: any): Promise<any>;
};

export type NetworkActions = ReadOnlyNetworkActions & {
  predictSpaceAddress(web3: Web3Provider, params: { salt: string }): Promise<string | null>;
  deployDependency(
    web3: Web3Provider,
    params: {
      controller: string;
      spaceAddress: string;
      strategy: StrategyConfig;
    }
  ): Promise<{ address: string; txId: string }>;
  createSpace(
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
      metadata: SpaceMetadata;
    }
  );
  setMetadata(web3: Web3Provider, space: Space, metadata: SpaceMetadata);
  finalizeProposal(web3: Web3Provider, proposal: Proposal);
  executeTransactions(web3: Web3Provider, proposal: Proposal);
  executeQueuedProposal(web3: Web3Provider, proposal: Proposal);
  vetoProposal(web3: Web3Provider, proposal: Proposal);
  setVotingDelay(web3: Web3Provider, space: Space, votingDelay: number);
  setMinVotingDuration(web3: Web3Provider, space: Space, minVotingDuration: number);
  setMaxVotingDuration(web3: Web3Provider, space: Space, maxVotingDuration: number);
  transferOwnership(web3: Web3Provider, space: Space, owner: string);
  updateStrategies(
    web3: Web3Provider,
    space: Space,
    authenticatorsToAdd: StrategyConfig[],
    authenticatorsToRemove: number[],
    votingStrategiesToAdd: StrategyConfig[],
    votingStrategiesToRemove: number[],
    validationStrategy: StrategyConfig
  );
  delegate(
    web3: Web3Provider,
    space: Space,
    networkId: NetworkID,
    delegatee: string,
    delegationContract: string
  );
};

export type NetworkApi = {
  loadProposalVotes(
    proposal: Proposal,
    paginationOpts: PaginationOpts,
    filter?: 'any' | 'for' | 'against' | 'abstain',
    sortBy?: 'vp-desc' | 'vp-asc' | 'created-desc' | 'created-asc'
  ): Promise<Vote[]>;
  loadUserVotes(spaceId: string, voter: string): Promise<{ [key: string]: Vote }>;
  loadProposals(
    spaceId: string,
    paginationOpts: PaginationOpts,
    current: number,
    filter?: 'any' | 'active' | 'pending' | 'closed',
    searchQuery?: string
  ): Promise<Proposal[]>;
  loadProposal(
    spaceId: string,
    proposalId: number | string,
    current: number
  ): Promise<Proposal | null>;
  loadSpaces(paginationOpts: PaginationOpts, filter?: SpacesFilter): Promise<Space[]>;
  loadSpace(spaceId: string): Promise<Space | null>;
  loadUser(userId: string): Promise<User | null>;
};

export type NetworkConstants = {
  AUTHS: { [key: string]: string };
  PROPOSAL_VALIDATIONS: { [key: string]: string };
  STRATEGIES: { [key: string]: string };
  EXECUTORS: { [key: string]: string };
  EDITOR_AUTHENTICATORS: StrategyTemplate[];
  EDITOR_PROPOSAL_VALIDATIONS: StrategyTemplate[];
  EDITOR_VOTING_STRATEGIES: StrategyTemplate[];
  EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES: StrategyTemplate[];
  EDITOR_EXECUTION_STRATEGIES: StrategyTemplate[];
};

export type NetworkHelpers = {
  isAuthenticatorSupported(authenticator: string): boolean;
  isAuthenticatorContractSupported(authenticator: string): boolean;
  getRelayerAuthenticatorType(authenticator: string): 'evm' | 'evm-tx' | 'starknet' | null;
  isStrategySupported(strategy: string): boolean;
  isExecutorSupported(executor: string): boolean;
  isVotingTypeSupported(type: string): boolean;
  pin: (content: any) => Promise<{ cid: string; provider: string }>;
  waitForTransaction(txId: string): Promise<any>;
  waitForSpace(spaceAddress: string, interval?: number): Promise<Space>;
  getExplorerUrl(
    id: string,
    type: 'transaction' | 'address' | 'contract' | 'strategy' | 'token',
    chainId?: number
  ): string;
};

type BaseNetwork = {
  name: string;
  avatar: string;
  currentUnit: 'block' | 'second';
  chainId: number | string;
  baseChainId: number;
  currentChainId: number;
  baseNetworkId?: NetworkID;
  supportsSimulation: boolean;
  managerConnectors: Connector[];
  api: NetworkApi;
  constants: NetworkConstants;
  helpers: NetworkHelpers;
};

export type ReadOnlyNetwork = BaseNetwork & { readOnly: true; actions: ReadOnlyNetworkActions };
export type ReadWriteNetwork = BaseNetwork & { readOnly?: false; actions: NetworkActions };
export type Network = ReadOnlyNetwork | ReadWriteNetwork;
