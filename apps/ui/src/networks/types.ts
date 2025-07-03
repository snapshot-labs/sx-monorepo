import { Web3Provider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { FunctionalComponent } from 'vue';
import {
  Alias,
  ChainId,
  Choice,
  DelegationType,
  Follow,
  NetworkID,
  Privacy,
  Proposal,
  Setting,
  Space,
  SpaceMetadata,
  SpaceMetadataDelegation,
  Statement,
  StrategyParsedMetadata,
  Transaction,
  User,
  UserActivity,
  Vote,
  VoteType
} from '@/types';

export type PaginationOpts = { limit: number; skip?: number };
export type SpacesFilter = {
  controller?: string;
  id_in?: string[];
  searchQuery?: string;
  domain?: string;
  category?: string;
  network?: string;
};
export type ProposalsFilter = {
  state?: 'any' | 'active' | 'pending' | 'closed';
  labels?: string[];
} & Record<string, any>;
export type ConnectorType =
  | 'argentx'
  | 'injected'
  | 'walletconnect'
  | 'coinbase'
  | 'gnosis'
  | 'sequence'
  | 'unicorn'
  | 'guest';
export type Connector = {
  id: string;
  type: ConnectorType;
  info: {
    name: string;
    icon: string;
  };
  options: any;
  provider: any;
  autoConnectOnly: boolean;
  connect: () => void;
  autoConnect: () => void;
  disconnect: () => void;
};
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
  /**
   * Deprecated strategy can still be used but can't be added to new spaces.
   */
  deprecated?: boolean;
  about?: string;
  author?: string;
  version?: string;
  spaceCount?: number;
  verifiedSpaceCount?: number;
  link?: string;
  icon?: FunctionalComponent;
  type?: string;
  defaultParams?: any;
  paramsDefinition: any;
  validate?: (params: Record<string, any>) => boolean;
  generateSummary?: (params: Record<string, any>) => string;
  generateParams?: (params: Record<string, any>) => Promise<any[]>;
  generateMetadata?: (
    params: Record<string, any>
  ) => Promise<GeneratedMetadata>;
  parseParams?: (
    params: string,
    metadata: StrategyParsedMetadata | null
  ) => Promise<Record<string, any>>;
  deployConnectors?: ConnectorType[];
  deployNetworkId?: NetworkID;
  deploy?: (
    client: any,
    web3: any,
    controller: string,
    spaceAddress: string,
    params: Record<string, any>
  ) => Promise<{ address: string; txId: string }>;
};

export type StrategyConfig = StrategyTemplate & {
  id: string;
  chainId?: ChainId;
  params: Record<string, any>;
};

export type ExecutionInfo = {
  strategyType: string;
  strategyAddress: string;
  destinationAddress: string;
  treasuryName: string;
  chainId: number;
  transactions: Transaction[];
};

export type SnapshotInfo = {
  at: number | null;
  chainId?: ChainId;
};

export type VotingPower = {
  address: string;
  value: bigint;
  /**
   * Decimals used to interpret value in context of final (total) VP.
   */
  cumulativeDecimals: number;
  /**
   * Decimals used to display this strategy value.
   */
  displayDecimals: number;
  token: string | null;
  symbol: string;
  chainId?: ChainId;
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
    web3: Web3Provider | Wallet,
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
    max_end: number,
    executions: ExecutionInfo[] | null
  ): Promise<any>;
  updateProposal(
    web3: Web3Provider | Wallet,
    connectorType: ConnectorType,
    account: string,
    space: Space,
    proposalId: number | string,
    title: string,
    body: string,
    discussion: string,
    type: VoteType,
    choices: string[],
    privacy: Privacy,
    labels: string[],
    executions: ExecutionInfo[] | null
  ): Promise<any>;
  flagProposal(
    web3: Web3Provider | Wallet,
    account: string,
    proposal: Proposal
  );
  cancelProposal(
    web3: Web3Provider | Wallet,
    connectorType: ConnectorType,
    account: string,
    proposal: Proposal
  );
  vote(
    web3: Web3Provider | Wallet,
    connectorType: ConnectorType,
    account: string,
    proposal: Proposal,
    choice: Choice,
    reason: string,
    app: string
  ): Promise<any>;
  followSpace(
    web3: Web3Provider | Wallet,
    networkId: NetworkID,
    spaceId: string,
    from?: string
  );
  unfollowSpace(
    web3: Web3Provider | Wallet,
    networkId: NetworkID,
    spaceId: string,
    from?: string
  );
  setAlias(web3: Web3Provider, alias: string);
  updateUser(web3: Web3Provider | Wallet, user: User, from?: string);
  updateStatement(
    web3: Web3Provider | Wallet,
    statement: Statement,
    from?: string
  );
  transferOwnership(
    web3: Web3Provider,
    connectorType: ConnectorType,
    space: Space,
    owner: string
  );
  updateSettingsRaw(web3: Web3Provider, space: Space, settings: string);
  createSpaceRaw(web3: Web3Provider, id: string, settings: string);
  deleteSpace(web3: Web3Provider, space: Space);
  send(envelope: any): Promise<any>;
};

export type NetworkActions = ReadOnlyNetworkActions & {
  predictSpaceAddress(
    web3: Web3Provider,
    params: { salt: string }
  ): Promise<string | null>;
  deployDependency(
    web3: Web3Provider,
    connectorType: ConnectorType,
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
      executionDestinations: string[];
      metadata: SpaceMetadata;
    }
  );
  finalizeProposal(web3: Web3Provider, proposal: Proposal);
  executeTransactions(web3: Web3Provider, proposal: Proposal);
  executeQueuedProposal(web3: Web3Provider, proposal: Proposal);
  vetoProposal(web3: Web3Provider, proposal: Proposal);
  updateSettings(
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
  );
  delegate(
    web3: Web3Provider,
    space: Space,
    networkId: NetworkID,
    delegationType: DelegationType,
    delegatees: string[],
    delegationContract: string,
    chainIdOverride?: ChainId,
    delegateesMetadata?: Record<string, any>
  );
  getDelegatee(
    delegation: SpaceMetadataDelegation,
    delegator: string
  ): Promise<{ address: string; balance: bigint; decimals: number } | null>;
};

export type NetworkApi = {
  apiUrl: string;
  loadProposalVotes(
    proposal: Proposal,
    paginationOpts: PaginationOpts,
    filter?: 'any' | 'for' | 'against' | 'abstain',
    sortBy?: 'vp-desc' | 'vp-asc' | 'created-desc' | 'created-asc'
  ): Promise<Vote[]>;
  loadUserVotes(
    spaceIds: string[],
    voter: string,
    paginationOpts: PaginationOpts
  ): Promise<{ [key: string]: Vote }>;
  loadProposals(
    spaceIds: string[],
    paginationOpts: PaginationOpts,
    current: number,
    filter?: ProposalsFilter,
    searchQuery?: string
  ): Promise<Proposal[]>;
  loadProposal(
    spaceId: string,
    proposalId: number | string,
    current: number
  ): Promise<Proposal | null>;
  loadSpaces(
    paginationOpts: PaginationOpts,
    filter?: SpacesFilter
  ): Promise<Space[]>;
  loadSpace(spaceId: string): Promise<Space | null>;
  loadUser(userId: string): Promise<User | null>;
  loadUserActivities(userId: string): Promise<UserActivity[]>;
  loadLeaderboard(
    spaceId: string,
    paginationOpts: PaginationOpts,
    sortBy?:
      | 'vote_count-desc'
      | 'vote_count-asc'
      | 'proposal_count-desc'
      | 'proposal_count-asc',
    user?: string
  ): Promise<UserActivity[]>;
  loadFollows(userId?: string, spaceId?: string): Promise<Follow[]>;
  loadAlias(
    address: string,
    alias: string,
    created_gt: number
  ): Promise<Alias | null>;
  loadStatement(
    networkId: NetworkID,
    spaceId: string,
    userId: string
  ): Promise<Statement | null>;
  loadStatements(
    networkId: NetworkID,
    spaceId: string,
    userIds: string[]
  ): Promise<Statement[]>;
  loadStrategies(): Promise<StrategyTemplate[]>;
  loadStrategy(address: string): Promise<StrategyTemplate | null>;
  getNetworks(): Promise<
    Record<ChainId, { spaces_count: number; premium: boolean }>
  >;
  loadSettings(): Promise<Setting[]>;
  loadLastIndexedBlock(): Promise<number | null>;
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
  EDITOR_VOTING_TYPES: VoteType[];
  STORAGE_PROOF_STRATEGIES_TYPES?: string[];
};

export type AuthenticatorSupportInfo = {
  /**
   * Whether the authenticator is supported by the app.
   */
  isSupported: boolean;
  /**
   * Whether the authenticator can be used with contract-based accounts.
   */
  isContractSupported: boolean;
  /**
   * Type of the relayer used by authenticator.
   * Determines how authenticator is interacted with.
   */
  relayerType?: 'starknet' | 'evm' | 'evm-tx';
  /**
   * List of connectors that can be used with this authenticator.
   */
  connectors: ConnectorType[];
  /**
   * Priority of the authenticator.
   * Lower number means higher priority.
   * Default is 0.
   */
  priority?: number;
};

export type NetworkHelpers = {
  getAuthenticatorSupportInfo(
    authenticator: string
  ): AuthenticatorSupportInfo | null;
  isStrategySupported(strategy: string): boolean;
  /**
   * Checks if the executor type is supported.
   * If supported executor can be used to create proposal execution.
   * @param executorType executor type
   */
  isExecutorSupported(executorType: string): boolean;
  /**
   * Checks if the executor actions are supported.
   * If supported UI will show execution actions for the executor.
   * @param executorType executor type
   */
  isExecutorActionsSupported(executorType: string): boolean;
  pin: (content: any) => Promise<{ cid: string; provider: string }>;
  getSpaceController(space: Space): Promise<string>;
  getRelayerInfo(space: string, network: NetworkID): Promise<any>;
  getTransaction(txId: string): Promise<any>;
  waitForTransaction(txId: string): Promise<any>;
  waitForIndexing(txId: string, timeout?: number): Promise<boolean>;
  waitForSpace(spaceAddress: string, interval?: number): Promise<Space>;
  getExplorerUrl(
    id: string,
    type: 'transaction' | 'address' | 'contract' | 'strategy' | 'token',
    chainId?: ChainId
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
  managerConnectors: ConnectorType[];
  api: NetworkApi;
  constants: NetworkConstants;
  helpers: NetworkHelpers;
};

export type ReadOnlyNetwork = BaseNetwork & {
  readOnly: true;
  actions: ReadOnlyNetworkActions;
};
export type ReadWriteNetwork = BaseNetwork & {
  readOnly?: false;
  actions: NetworkActions;
};
export type Network = ReadOnlyNetwork | ReadWriteNetwork;

export type ExplorePageProtocol = 'snapshot' | 'snapshot-x';

export type ProtocolConfig = {
  key: ExplorePageProtocol;
  label: string;
  apiNetwork: NetworkID;
  networks: NetworkID[];
  limit: number;
};
