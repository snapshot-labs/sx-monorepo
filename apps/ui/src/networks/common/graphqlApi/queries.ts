import { gql } from './gql';

gql(`
  fragment voteFields on Vote {
    id
    voter {
      id
    }
    space {
      id
    }
    metadata {
      reason
    }
    proposal
    choice
    vp
    created
    tx
  }

  fragment spaceFields on Space {
    id
    _indexer
    verified
    turbo
    metadata {
      name
      avatar
      cover
      about
      external_url
      github
      twitter
      discord
      farcaster
      voting_power_symbol
      treasuries
      labels
      delegations
      executors
      executors_types
      executors_destinations
      executors_strategies {
        id
        address
        destination_address
        type
        treasury_chain
        treasury
      }
    }
    controller
    voting_delay
    min_voting_period
    max_voting_period
    proposal_threshold
    validation_strategy
    validation_strategy_params
    voting_power_validation_strategy_strategies
    voting_power_validation_strategy_strategies_params
    voting_power_validation_strategies_parsed_metadata {
      index
      data {
        id
        name
        description
        decimals
        symbol
        token
        payload
      }
    }
    strategies_indices
    strategies
    strategies_params
    strategies_parsed_metadata {
      index
      data {
        id
        name
        description
        decimals
        symbol
        token
        payload
      }
    }
    authenticators
    proposal_count
    vote_count
    created
  }

  fragment proposalFields on Proposal {
    id
    proposal_id
    space {
      ...spaceFields
    }
    author {
      id
      address_type
    }
    quorum
    execution_hash
    metadata {
      id
      title
      body
      discussion
      execution
      choices
      labels
    }
    start
    min_end
    max_end
    snapshot
    scores_1
    scores_2
    scores_3
    scores_total
    execution_time
    execution_strategy
    execution_strategy_details {
      id
      address
      destination_address
      type
      treasury_chain
      treasury
      quorum
    }
    execution_strategy_type
    execution_destination
    treasuries
    timelock_veto_guardian
    strategies_indices
    strategies
    strategies_params
    created
    edited
    tx
    execution_tx
    veto_tx
    vote_count
    execution_ready
    executed
    vetoed
    completed
    cancelled
  }
`);

export const PROPOSAL_QUERY = gql(`
  query Proposal($id: String!) {
    proposal(id: $id) {
      ...proposalFields
    }
  }
`);

export const PROPOSALS_QUERY = gql(`
  query Proposals($first: Int!, $skip: Int!, $where: Proposal_filter) {
    proposals(
      first: $first
      skip: $skip
      where: $where
      orderBy: created
      orderDirection: desc
    ) {
      ...proposalFields
    }
  }
`);

export const VOTES_QUERY = gql(`
  query Votes(
    $indexer: String!
    $first: Int!
    $skip: Int!
    $orderBy: Vote_orderBy!
    $orderDirection: OrderDirection!
    $where: Vote_filter
  ) {
    votes(
      indexer: $indexer
      first: $first
      skip: $skip
      where: $where
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      ...voteFields
    }
  }
`);

export const USER_VOTES_QUERY = gql(`
  query UserVotes(
    $indexer: String!
    $first: Int
    $skip: Int
    $spaceIds: [String]
    $voter: String
  ) {
    votes(
      indexer: $indexer
      first: $first
      skip: $skip
      where: { space_in: $spaceIds, voter: $voter }
    ) {
      ...voteFields
    }
  }
`);

export const SPACE_QUERY = gql(`
  query Space($indexer: String!, $id: String!) {
    space(indexer: $indexer, id: $id) {
      ...spaceFields
    }
  }
`);

export const SPACES_QUERY = gql(`
  query Spaces($indexer: String, $first: Int!, $skip: Int!, $where: Space_filter) {
    spaces(
      indexer: $indexer
      first: $first
      skip: $skip
      orderBy: vote_count
      orderDirection: desc
      where: $where
    ) {
      ...spaceFields
    }
  }
`);

export const USER_QUERY = gql(`
  query User($indexer: String!, $id: String!) {
    user(indexer: $indexer, id: $id) {
      id
      proposal_count
      vote_count
      created
    }
  }
`);

export const LEADERBOARD_QUERY = gql(`
  query Leaderboard(
    $indexer: String!
    $first: Int!
    $skip: Int!
    $orderBy: Leaderboard_orderBy
    $orderDirection: OrderDirection!
    $where: Leaderboard_filter
  ) {
    leaderboards(
      indexer: $indexer
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: $where
    ) {
      id
      user {
        id
        created
      }
      space {
        id
      }
      proposal_count
      vote_count
    }
  }
`);

export const LAST_INDEXED_BLOCK_QUERY = gql(`
  query _Metadata($indexer: String!) {
    _metadata(indexer: $indexer, id: "last_indexed_block") {
      value
    }
  }
`);
