// UI
export type NotificationType = 'error' | 'warning' | 'success';

export type NetworkID = 'gor' | 'sep' | 'linea-testnet' | 'sn-tn2';
export type Choice = 1 | 2 | 3;

export type SelectedStrategy = {
  address: string;
  type: string;
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
  walletNetwork: NetworkID | null;
  walletAddress: string | null;
  delegationApiType: string | null;
  delegationApiUrl: string | null;
};

export type SpaceSettings = {
  votingDelay: number;
  minVotingDuration: number;
  maxVotingDuration: number;
  proposalThreshold: string;
  quorum?: string;
};

export type StrategyParsedMetadata = {
  decimals: number;
  symbol: string;
  token: string | null;
};

export type Space = {
  id: string;
  network: NetworkID;
  name: string;
  avatar: string;
  cover: string;
  about?: string;
  external_url: string;
  delegation_api_type: string | null;
  delegation_api_url: string | null;
  twitter: string;
  github: string;
  discord: string;
  voting_power_symbol: string;
  wallet: string;
  controller: string;
  voting_delay: number;
  min_voting_period: number;
  max_voting_period: number;
  proposal_threshold: string;
  validation_strategy: string;
  voting_power_validation_strategy_strategies: string[];
  voting_power_validation_strategy_strategies_params: string[];
  strategies: string[];
  strategies_params: any[];
  strategies_parsed_metadata: StrategyParsedMetadata[];
  authenticators: string[];
  executors: string[];
  executors_types: string[];
  proposal_count: number;
  vote_count: number;
  created: number;
};

export type Proposal = {
  id: string;
  proposal_id: number;
  network: NetworkID;
  quorum: number;
  space: {
    id: string;
    avatar: string;
    controller: string;
    voting_power_symbol: string;
    authenticators: string[];
    executors: string[];
    executors_types: string[];
    strategies_parsed_metadata: StrategyParsedMetadata[];
  };
  author: {
    id: string;
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
  scores_1: number;
  scores_2: number;
  scores_3: number;
  scores_total: number;
  execution_time: number;
  execution_strategy: string;
  execution_strategy_type: string;
  timelock_veto_guardian: string | null;
  strategies: string[];
  strategies_params: any[];
  created: number;
  edited: number | null;
  tx: string;
  execution_tx: string | null;
  veto_tx: string | null;
  vote_count: number;
  has_started: boolean;
  has_execution_window_opened: boolean;
  has_ended: boolean;
  executed: boolean;
  vetoed: boolean;
  completed: boolean;
  cancelled: boolean;
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
  proposal: number;
  choice: number;
  vp: number;
  created: number;
};

export type Draft = {
  proposalId: number | null;
  title: string;
  body: string;
  discussion: string;
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
