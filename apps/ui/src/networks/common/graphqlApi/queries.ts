import gql from 'graphql-tag';

const SPACE_FRAGMENT = gql`
  fragment spaceFragment on Space {
    id
    metadata {
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
      executors
      executors_types
    }
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
      data {
        decimals
        symbol
        token
      }
    }
    authenticators
    proposal_count
    vote_count
    created
  }
`;

const PROPOSAL_FRAGMENT = gql`
  fragment proposalFragment on Proposal {
    id
    proposal_id
    space {
      id
      authenticators
      metadata {
        id
        voting_power_symbol
        executors
        executors_types
      }
      strategies_parsed_metadata {
        data {
          decimals
          symbol
          token
        }
      }
    }
    author {
      id
    }
    quorum
    execution_hash
    metadata {
      id
      title
      body
      discussion
      execution
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

export const PROPOSAL_QUERY = gql`
  query ($id: String!) {
    proposal(id: $id) {
      ...proposalFragment
    }
  }
  ${PROPOSAL_FRAGMENT}
`;

export const PROPOSALS_QUERY = gql`
  query ($first: Int!, $skip: Int!, $space: String!, $searchQuery: String) {
    proposals(
      first: $first
      skip: $skip
      where: { metadata_: {}, space: $space, metadata_: { title_contains_nocase: $searchQuery } }
      orderBy: created
      orderDirection: desc
    ) {
      ...proposalFragment
    }
  }
  ${PROPOSAL_FRAGMENT}
`;

export const PROPOSALS_SUMMARY_QUERY = gql`
  query ($first: Int!, $space: String!, $threshold: Int) {
    active: proposals(
      first: $first
      where: { space: $space, metadata_: {}, max_end_gte: $threshold }
      orderBy: created
      orderDirection: desc
    ) {
      ...proposalFragment
    }

    expired: proposals(
      first: $first
      where: { space: $space, metadata_: {}, max_end_lt: $threshold }
      orderBy: created
      orderDirection: desc
    ) {
      ...proposalFragment
    }
  }

  ${PROPOSAL_FRAGMENT}
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
      ...spaceFragment
    }
  }
  ${SPACE_FRAGMENT}
`;

export const SPACES_QUERY = gql`
  query ($first: Int!, $skip: Int!, $where: Space_filter) {
    spaces(first: $first, skip: $skip, orderBy: vote_count, orderDirection: desc, where: $where) {
      ...spaceFragment
    }
  }
  ${SPACE_FRAGMENT}
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
