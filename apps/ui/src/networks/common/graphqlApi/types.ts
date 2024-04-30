export type ApiStrategyParsedMetadata = {
  index: number;
  data: {
    name: string;
    description: string;
    decimals: number;
    symbol: string;
    token: string | null;
    payload: string | null;
  };
};

export type ApiSpace = {
  id: string;
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
    executors_strategies: {
      id: string;
      type: string;
      treasury: string | null;
      treasury_chain: number | null;
    }[];
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
    title: string;
    body: string;
    discussion: string;
    execution: string;
  };
  space: {
    id: string;
    controller: string;
    metadata: {
      name: string;
      avatar: string;
      voting_power_symbol: string;
      executors: string[];
      executors_types: string[];
    };
    authenticators: string[];
    strategies_parsed_metadata: ApiStrategyParsedMetadata[];
  };
  author: {
    id: string;
  };
  quorum: number;
  execution_hash: string;
  start: number;
  min_end: number;
  max_end: number;
  snapshot: number;
  // TODO: those are actually numbers, we need to adjust it across the app at some point
  scores_1: number;
  scores_2: number;
  scores_3: number;
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
  execution_ready: boolean;
  executed: boolean;
  vetoed: boolean;
  completed: boolean;
  cancelled: boolean;
};
