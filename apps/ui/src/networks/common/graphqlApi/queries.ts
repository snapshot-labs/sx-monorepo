import gql from 'graphql-tag';

export const PROPOSAL_QUERY = gql`
  query ($id: String!) {
    proposal(id: $id) {
      id
      proposal_id
      space {
        id
        voting_power_symbol
        authenticators
        strategies_parsed_metadata {
          decimals
          symbol
          token
        }
        executors
        executors_types
      }
      author {
        id
      }
      quorum
      execution_hash
      metadata_uri
      title
      body
      discussion
      execution
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
      execution_strategy_type
      strategies
      strategies_params
      created
      tx
      execution_tx
      vote_count
      executed
      completed
    }
  }
`;

export const PROPOSALS_QUERY = gql`
  query ($first: Int!, $skip: Int!, $space: String!, $searchQuery: String) {
    proposals(
      first: $first
      skip: $skip
      where: { space: $space, title_contains_nocase: $searchQuery }
      orderBy: created
      orderDirection: desc
    ) {
      id
      proposal_id
      space {
        id
        voting_power_symbol
        quorum
        authenticators
        strategies_parsed_metadata {
          decimals
          symbol
          token
        }
        executors
        executors_types
      }
      author {
        id
      }
      quorum
      execution_hash
      metadata_uri
      title
      body
      discussion
      execution
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
      execution_strategy_type
      strategies
      strategies_params
      created
      tx
      execution_tx
      vote_count
      executed
      completed
    }
  }
`;

export const PROPOSALS_SUMMARY_QUERY = gql`
  query ($first: Int!, $space: String!, $threshold: Int) {
    active: proposals(
      first: $first
      where: { space: $space, max_end_gte: $threshold }
      orderBy: created
      orderDirection: desc
    ) {
      ...proposalFields
    }

    expired: proposals(
      first: $first
      where: { space: $space, max_end_lt: $threshold }
      orderBy: created
      orderDirection: desc
    ) {
      ...proposalFields
    }
  }

  fragment proposalFields on Proposal {
    id
    proposal_id
    space {
      id
      authenticators
      executors
    }
    author {
      id
    }
    quorum
    execution_hash
    metadata_uri
    title
    body
    discussion
    execution
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
    execution_strategy_type
    strategies
    strategies_params
    created
    tx
    execution_tx
    vote_count
    executed
    completed
  }
`;

export const VOTES_QUERY = gql`
  query ($space: String, $proposal: Int) {
    votes(where: { space: $space, proposal: $proposal }, orderBy: vp, orderDirection: desc) {
      id
      voter {
        id
      }
      space {
        id
      }
      proposal
      choice
      vp
      created
    }
  }
`;

export const USER_VOTES_QUERY = gql`
  query ($voter: String) {
    votes(where: { voter: $voter }) {
      id
      voter {
        id
      }
      space {
        id
      }
      proposal
      choice
      vp
      created
    }
  }
`;

export const SPACE_QUERY = gql`
  query ($id: String!) {
    space(id: $id) {
      id
      name
      avatar
      about
      external_url
      github
      twitter
      discord
      voting_power_symbol
      wallet
      delegation_api_type
      delegation_api_url
      controller
      voting_delay
      min_voting_period
      max_voting_period
      proposal_threshold
      validation_strategy
      voting_power_validation_strategy_strategies
      voting_power_validation_strategy_strategies_params
      strategies
      strategies_params
      strategies_parsed_metadata {
        decimals
        symbol
        token
      }
      authenticators
      executors
      executors_types
      proposal_count
      vote_count
      created
    }
  }
`;

export const SPACES_QUERY = gql`
  query ($first: Int!, $skip: Int!, $where: Space_filter) {
    spaces(first: $first, skip: $skip, orderBy: vote_count, orderDirection: desc, where: $where) {
      id
      name
      about
      external_url
      github
      twitter
      discord
      voting_power_symbol
      wallet
      delegation_api_url
      controller
      voting_delay
      min_voting_period
      max_voting_period
      proposal_threshold
      validation_strategy
      voting_power_validation_strategy_strategies
      voting_power_validation_strategy_strategies_params
      strategies
      strategies_params
      strategies_parsed_metadata {
        decimals
        symbol
        token
      }
      authenticators
      executors
      executors_types
      proposal_count
      vote_count
      created
    }
  }
`;

export const USER_QUERY = gql`
  query ($id: String!) {
    user(id: $id) {
      id
      proposal_count
      vote_count
      created
    }
  }
`;
