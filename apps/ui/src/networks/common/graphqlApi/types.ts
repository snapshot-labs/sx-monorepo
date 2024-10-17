export type ApiStrategyParsedMetadata = {
  index: number;
  data: {
    id: string;
    name: string;
    description: string;
    decimals: number;
    symbol: string;
    token: string | null;
    payload: string | null;
  };
};

export type ApiExecutorStrategy = {
  id: string;
  address: string;
  destination_address: string | null;
  type: string;
  treasury: string | null;
  treasury_chain: number | null;
};

export type ApiSpace = {
  id: string;
  verified: boolean;
  turbo: boolean;
  metadata: {
    name: string;
    avatar: string;
    cover: string;
    about?: string;
    external_url: string;
    twitter: string;
    github: string;
    discord: string;
    voting_power_symbol: string;
    wallet: string;
    executors: string[];
    executors_types: string[];
    executors_destinations: string[];
    executors_strategies: ApiExecutorStrategy[];
    treasuries: string[];
    delegations: string[];
  };
  controller: string;
  voting_delay: number;
  min_voting_period: number;
  max_voting_period: number;
  proposal_threshold: string;
  validation_strategy: string;
  validation_strategy_params: string;
  voting_power_validation_strategy_strategies: string[];
  voting_power_validation_strategy_strategies_params: string[];
  voting_power_validation_strategies_parsed_metadata: ApiStrategyParsedMetadata[];
  strategies_indicies: number[];
  strategies: string[];
  strategies_params: any[];
  strategies_parsed_metadata: ApiStrategyParsedMetadata[];
  authenticators: string[];
  proposal_count: number;
  vote_count: number;
  created: number;
};

export type ApiProposal = {
  id: string;
  proposal_id: number;
  metadata: {
    id: string;
    title: string | null;
    body: string | null;
    discussion: string | null;
    execution: string | null;
  };
  space: {
    id: string;
    controller: string;
    metadata: {
      name: string;
      avatar: string;
      voting_power_symbol: string;
      treasuries: string[];
      executors: string[];
      executors_types: string[];
      executors_strategies: ApiExecutorStrategy[];
    };
    authenticators: string[];
    strategies_parsed_metadata: ApiStrategyParsedMetadata[];
  };
  author: {
    id: string;
    address_type: 0 | 1 | 2;
  };
  quorum: number;
  execution_hash: string;
  start: number;
  min_end: number;
  max_end: number;
  snapshot: number;
  // TODO: those are actually strings, we need to adjust it across the app at some point
  scores_1: number;
  scores_2: number;
  scores_3: number;
  scores_total: number;
  execution_time: number;
  execution_strategy: string;
  execution_strategy_type: string;
  execution_destination: string | null;
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
  execution_ready: boolean;
  executed: boolean;
  vetoed: boolean;
  completed: boolean;
  cancelled: boolean;
};
