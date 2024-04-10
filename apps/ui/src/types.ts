// UI
export type NotificationType = 'error' | 'warning' | 'success';

export type ProposalState = 'pending' | 'active' | 'passed' | 'rejected' | 'executed';

export type NetworkID =
  | 's'
  | 's-tn'
  | 'eth'
  | 'matic'
  | 'arb1'
  | 'oeth'
  | 'gor'
  | 'sep'
  | 'linea-testnet'
  | 'sn'
  | 'sn-tn'
  | 'sn-sep';

export type Choice = 'for' | 'against' | 'abstain' | number | number[] | Record<string, number>;

export type Privacy = 'shutter' | null;

export type VoteType =
  | 'basic'
  | 'single-choice'
  | 'approval'
  | 'ranked-choice'
  | 'quadratic'
  | 'weighted'
  | 'custom';

export type SelectedStrategy = {
  address: string;
  type: string;
};

export type SpaceMetadataTreasury = {
  name: string | null;
  network: NetworkID | null;
  address: string | null;
};

export type SpaceMetadataDelegation = {
  name: string | null;
  apiType: string | null;
  apiUrl: string | null;
  contractNetwork: NetworkID | null;
  contractAddress: string | null;
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
  votingPowerSymbol: string;
  treasuries: SpaceMetadataTreasury[];
  delegations: SpaceMetadataDelegation[];
};

export type SpaceSettings = {
  votingDelay: number;
  minVotingDuration: number;
  maxVotingDuration: number;
};

export type StrategyParsedMetadata = {
  name: string;
  description: string;
  decimals: number;
  symbol: string;
  token: string | null;
  payload: string | null;
};

export type Space = {
  id: string;
  network: NetworkID;
  verified: boolean;
  turbo: boolean;
  snapshot_chain_id?: number;
  name: string;
  avatar: string;
  cover: string;
  about?: string;
  external_url: string;
  treasuries: SpaceMetadataTreasury[];
  delegations: SpaceMetadataDelegation[];
  twitter: string;
  github: string;
  discord: string;
  coingecko?: string;
  voting_power_symbol: string;
  controller: string;
  voting_delay: number;
  min_voting_period: number;
  max_voting_period: number;
  proposal_threshold: string;
  validation_strategy: string;
  validation_strategy_params: string;
  voting_power_validation_strategy_strategies: string[];
  voting_power_validation_strategy_strategies_params: string[];
  voting_power_validation_strategies_parsed_metadata: StrategyParsedMetadata[];
  strategies_indicies: number[];
  strategies: string[];
  strategies_params: any[];
  strategies_parsed_metadata: StrategyParsedMetadata[];
  authenticators: string[];
  executors: string[];
  executors_types: string[];
  executors_strategies: {
    id: string;
    type: string;
    treasury: string | null;
    treasury_chain: number | null;
  }[];
  proposal_count: number;
  vote_count: number;
  follower_count?: number;
  created: number;
};

export type Proposal = {
  id: string;
  proposal_id: number | string;
  network: NetworkID;
  type: VoteType;
  quorum: number;
  space: {
    id: string;
    name: string;
    snapshot_chain_id?: number;
    avatar: string;
    controller: string;
    admins?: string[];
    moderators?: string[];
    voting_power_symbol: string;
    authenticators: string[];
    executors: string[];
    executors_types: string[];
    strategies_parsed_metadata: StrategyParsedMetadata[];
  };
  author: {
    id: string;
    name?: string;
  };
  execution_hash: string;
  metadata_uri: string;
  title: string;
  body: string;
  discussion: string;
  execution: Transaction[];
  start: number;
  min_end: number;
  max_end: number;
  snapshot: number;
  choices: string[];
  scores: number[];
  scores_total: number;
  execution_time: number;
  execution_strategy: string;
  execution_strategy_type: string;
  timelock_veto_guardian: string | null;
  strategies_indicies: number[];
  strategies: string[];
  strategies_params: any[];
  created: number;
  edited: number | null;
  tx: string;
  execution_tx: string | null;
  veto_tx: string | null;
  vote_count: number;
  has_execution_window_opened: boolean;
  execution_ready: boolean;
  vetoed: boolean;
  completed: boolean;
  cancelled: boolean;
  state: ProposalState;
  privacy: Privacy;
};

export type User = {
  id: string;
  proposal_count: number;
  vote_count: number;
  created: number;
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
  created: number;
  tx: string;
};

export type Draft = {
  proposalId: number | string | null;
  title: string;
  body: string;
  discussion: string;
  type: VoteType;
  choices: string[];
  executionStrategy: SelectedStrategy | null;
  execution: Transaction[];
  updatedAt: number;
};

export type Metadata = {
  title: string;
  body: string;
  discussion: string;
  execution: Transaction[];
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
    amount: string;
    nft: {
      address: string;
      id: string;
      name: string;
      collection?: string;
    };
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

export type Transaction = SendTokenTransaction | SendNftTransaction | ContractCallTransaction;

// Utils
export type RequiredProperty<T> = { [P in keyof T]: Required<NonNullable<T[P]>> };
