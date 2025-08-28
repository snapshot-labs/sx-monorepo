import { VNode } from 'vue';
import { RouteLocationRaw } from 'vue-router';
import { ApiSpace as OffchainApiSpace } from '@/networks/offchain/api/types';

// UI
export type NotificationType = 'error' | 'warning' | 'success';

export type Task = {
  description: string;
  link?: RouteLocationRaw;
  currentStep?: number;
  totalSteps?: number;
  type?: NotificationType | 'info';
};

export type Theme = 'light' | 'dark';

export type ProposalState =
  | 'pending'
  | 'active'
  | 'passed'
  | 'rejected'
  | 'closed'
  | 'queued'
  | 'vetoed'
  | 'executed';

export type NetworkID =
  | 's'
  | 's-tn'
  | 'eth'
  | 'matic'
  | 'arb1'
  | 'oeth'
  | 'base'
  | 'mnt'
  | 'ape'
  | 'curtis'
  | 'sep'
  | 'sn'
  | 'sn-sep'
  | 'base-sep';

export type ChainId = number | string;

export type Choice =
  | 'for'
  | 'against'
  | 'abstain'
  | number
  | number[]
  | Record<string, number>;

export type Privacy = 'shutter' | 'none';
export type SpacePrivacy = Privacy | 'any';

export type VoteType =
  | 'basic'
  | 'single-choice'
  | 'approval'
  | 'copeland'
  | 'ranked-choice'
  | 'quadratic'
  | 'weighted'
  | 'custom';

export type VoteTypeInfo = {
  label: string;
  description: string;
  isBeta?: boolean;
};

export type DelegationType =
  | 'governor-subgraph'
  | 'apechain-delegate-registry'
  // From v1
  | 'delegate-registry'
  | 'split-delegation';

export type SelectedStrategy = {
  address: string;
  destinationAddress?: string | null;
  type: string;
};

export type SpaceMetadataTreasury = {
  name: string;
  address: string;
  chainId: ChainId | null;
};

export type SpaceMetadataLabel = {
  id: string;
  name: string;
  description: string;
  color: string;
};

export type SpaceMetadataDelegation = {
  name: string | null;
  apiType: DelegationType | null;
  apiUrl: string | null;
  contractAddress: string | null;
  chainId: ChainId | null;
};

export type SpaceMetadata = {
  name: string;
  avatar: string;
  cover: string;
  description: string;
  externalUrl: string;
  twitter: string;
  github: string;
  discord: string;
  farcaster: string;
  votingPowerSymbol: string;
  treasuries: SpaceMetadataTreasury[];
  labels: SpaceMetadataLabel[];
  delegations: SpaceMetadataDelegation[];
};

export type SpaceSettings = {
  votingDelay: number;
  minVotingDuration: number;
  maxVotingDuration: number;
};

export type StrategyParsedMetadata = {
  id: string;
  name: string;
  description: string;
  decimals: number;
  symbol: string;
  token: string | null;
  payload: string | null;
};

export type RelatedSpace = {
  id: string;
  name: string;
  network: NetworkID;
  avatar: string;
  cover: string;
  about?: string;
  proposal_count: number;
  vote_count: number;
  active_proposals: number | null;
  turbo: boolean;
  verified: boolean;
  snapshot_chain_id: string;
};

export type Validation = {
  name: string;
  params: Record<string, any>;
};

export type OffchainAdditionalRawData = {
  type: 'offchain';
} & Pick<
  OffchainApiSpace,
  | 'private'
  | 'flagged'
  | 'flagCode'
  | 'domain'
  | 'skin'
  | 'skinSettings'
  | 'strategies'
  | 'categories'
  | 'admins'
  | 'moderators'
  | 'members'
  | 'plugins'
  | 'delegationPortal'
  | 'filters'
  | 'voting'
  | 'validation'
  | 'voteValidation'
  | 'boost'
>;

export type Space = {
  id: string;
  network: NetworkID;
  verified: boolean;
  turbo: boolean;
  turbo_expiration: number;
  snapshot_chain_id?: string;
  name: string;
  avatar: string;
  cover: string;
  about?: string;
  external_url: string;
  treasuries: SpaceMetadataTreasury[];
  labels?: SpaceMetadataLabel[];
  delegations: SpaceMetadataDelegation[];
  twitter: string;
  github: string;
  discord: string;
  farcaster: string;
  coingecko?: string;
  terms: string;
  privacy: SpacePrivacy;
  voting_power_symbol: string;
  active_proposals: number | null;
  controller: string;
  voting_delay: number;
  voting_types: VoteType[];
  min_voting_period: number;
  max_voting_period: number;
  proposal_threshold: string;
  validation_strategy: string;
  validation_strategy_params: string;
  voting_power_validation_strategy_strategies: string[];
  voting_power_validation_strategy_strategies_params: string[];
  voting_power_validation_strategies_parsed_metadata: StrategyParsedMetadata[];
  strategies_indices: number[];
  strategies: string[];
  strategies_params: any[];
  strategies_parsed_metadata: StrategyParsedMetadata[];
  authenticators: string[];
  executors: string[];
  executors_types: string[];
  executors_destinations: string[];
  executors_strategies: {
    address: string;
    destination_address: string | null;
    type: string;
    treasury: string | null;
    treasury_chain: number | null;
  }[];
  proposal_count: number;
  proposal_count_1d?: number;
  proposal_count_30d?: number;
  vote_count: number;
  follower_count?: number;
  created: number;
  children: RelatedSpace[];
  parent: RelatedSpace | null;
  template: string | null;
  guidelines: string | null;
  // only use this for settings, if it's actually used for other things
  // move it to main space type
  additionalRawData?: OffchainAdditionalRawData;
};

export type ProposalExecution = {
  strategyType: string;
  safeName: string;
  safeAddress: string;
  transactions: Transaction[];
  chainId: ChainId;
};

export type Proposal = {
  id: string;
  proposal_id: number | string;
  network: NetworkID;
  execution_network: NetworkID;
  /**
   * If proposal is invalid it means that it was not created correctly.
   */
  isInvalid: boolean;
  vp_decimals: number;
  type: VoteType;
  quorum: number;
  quorum_type?: 'default' | 'rejection';
  space: {
    id: string;
    name: string;
    snapshot_chain_id?: string;
    avatar: string;
    terms: string;
    controller: string;
    admins?: string[];
    moderators?: string[];
    labels?: SpaceMetadataLabel[];
    voting_power_symbol: string;
    authenticators: string[];
    executors: string[];
    executors_types: string[];
    strategies_parsed_metadata: StrategyParsedMetadata[];
  };
  author: {
    id: string;
    address_type: 0 | 1 | 2;
    name?: string;
    role: Member['role'] | null;
  };
  execution_hash: string;
  metadata_uri: string;
  title: string;
  body: string;
  discussion: string;
  executions: ProposalExecution[];
  start: number;
  min_end: number;
  max_end: number;
  snapshot: number;
  choices: string[];
  labels: string[];
  scores: number[];
  scores_total: number;
  execution_time: number;
  execution_strategy: string;
  execution_strategy_type: string;
  execution_destination: string | null;
  timelock_veto_guardian: string | null;
  strategies_indices: number[];
  strategies: string[];
  strategies_params: any[];
  voting_power_validation_strategy_strategies: string[];
  voting_power_validation_strategy_strategies_params: any[];
  created: number;
  edited: number | null;
  tx: string;
  execution_tx: string | null;
  veto_tx: string | null;
  vote_count: number;
  has_execution_window_opened: boolean;
  execution_ready: boolean;
  vetoed: boolean;
  /**
   * Determines if proposal execution is settled - all transactions have been executed or vetoed.
   */
  execution_settled: boolean;
  /**
   * Determines if proposal is completed - all votes have been already counted.
   */
  completed: boolean;
  cancelled: boolean;
  state: ProposalState;
  privacy: Privacy;
  plugins: Record<string, unknown>;
  flagged: boolean;
  flag_code: number;
};

export type UserProfile = {
  name: string;
  about: string;
  avatar: string;
  cover: string;
  github: string;
  twitter: string;
  lens: string;
  farcaster: string;
  votesCount: number;
};

export type User = {
  id: string;
  created: number | null;
  follows?: string[];
} & Partial<UserProfile>;

export type UserActivity = {
  id: string;
  name?: string;
  spaceId: string;
  proposal_count: number;
  vote_count: number;
};

export type Statement = {
  space: string;
  network: NetworkID;
  about: string;
  statement: string;
  delegate: string;
  discourse: string;
  status: 'ACTIVE' | 'INACTIVE';
  source: string | null;
};

export type Follow = {
  id: string;
  follower: string;
  space: Space;
  created: number;
  network: NetworkID;
};

export type Alias = {
  address: string;
  alias: string;
};

export type Contact = {
  address: string;
  name: string;
};

export type Vote = {
  id: string;
  voter: {
    id: string;
    name?: string;
  };
  space: {
    id: string;
  };
  proposal: number | string;
  choice: number | number[] | Record<string, number>;
  vp: number;
  reason?: string;
  created: number;
  tx: string;
};

export type Member = {
  address: string;
  role: 'admin' | 'moderator' | 'author';
};

export type Draft = {
  originalProposal: Proposal | null;
  title: string;
  body: string;
  discussion: string;
  type: VoteType;
  choices: string[];
  privacy: Privacy;
  labels: string[];
  executions: Record<string, Transaction[] | undefined>;
  updatedAt: number;
  created?: number;
  start?: number;
  min_end?: number;
  max_end?: number;
};

export type Metadata = {
  title: string;
  body: string;
  discussion: string;
  execution: Transaction[];
};

export type SkinSettings = {
  bg_color: string;
  link_color: string;
  text_color: string;
  content_color: string;
  border_color: string;
  heading_color: string;
  primary_color: string;
  theme: Theme;
  logo?: string;
};

export type Drafts = Record<string, Draft>;

export type BaseTransaction = {
  to: string;
  data: string;
  value: string;
  salt: string;
};

export type SendTokenTransaction = BaseTransaction & {
  _type: 'sendToken';
  _form: {
    recipient: string;
    amount: string;
    token: {
      name: string;
      decimals: number;
      symbol: string;
      address: string;
    };
  };
};

export type SendNftTransaction = BaseTransaction & {
  _type: 'sendNft';
  _form: {
    recipient: string;
    sender: string;
    amount: string;
    nft: {
      type: string;
      address: string;
      id: string;
      name: string;
      collection?: string;
    };
  };
};

export type StakeTokenTransaction = BaseTransaction & {
  _type: 'stakeToken';
  _form: {
    recipient: string;
    args: any;
    amount: string;
  };
};

export type ContractCallTransaction = BaseTransaction & {
  _type: 'contractCall';
  _form: {
    abi: any[];
    recipient: string;
    method: string;
    args: any;
    amount?: string;
  };
};

export type RawTransaction = BaseTransaction & {
  _type: 'raw';
  _form: {
    recipient: string;
  };
};

export type Transaction =
  | SendTokenTransaction
  | SendNftTransaction
  | StakeTokenTransaction
  | ContractCallTransaction
  | RawTransaction;

// Utils
export type RequiredProperty<T> = {
  [P in keyof T]: Required<NonNullable<T[P]>>;
};

// UI
export type BaseDefinition<T> = {
  type: string | string[];
  format?: string;
  title: string;
  description?: string;
  default?: T;
  examples?: string[];
  tooltip?: string;
};

export type DefinitionWithOptions<T> = BaseDefinition<T> & {
  enum: T[];
  options: SelectItem<T>[];
};

export type DefinitionWithMultipleOptions<T> = BaseDefinition<T[]> & {
  enum: T[];
  options: SelectItem<T>[];
};

export type SelectItem<T> = {
  id: T;
  name?: string;
  icon?: VNode;
};

export type Setting = {
  name: string;
  value: string | string[];
};
