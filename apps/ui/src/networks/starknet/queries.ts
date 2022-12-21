import gql from 'graphql-tag';

export const PROPOSAL_QUERY = gql`
  query ($id: String!) {
    proposal(id: $id) {
      id
      proposal_id
      space {
        id
        quorum
        authenticators
      }
      author {
        id
      }
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
      strategies
      created
      tx
      vote_count
    }
  }
`;

export const PROPOSALS_QUERY = gql`
  query ($first: Int!, $skip: Int!, $space: String!) {
    proposals(
      first: $first
      skip: $skip
      where: { space: $space }
      orderBy: created
      orderDirection: desc
    ) {
      id
      proposal_id
      space {
        id
        quorum
        authenticators
      }
      author {
        id
      }
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
      strategies
      created
      tx
      vote_count
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
      quorum
      authenticators
    }
    author {
      id
    }
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
    strategies
    created
    tx
    vote_count
  }
`;

export const VOTES_QUERY = gql`
  query ($space: String, $proposal: Int, $voter: String) {
    votes(where: { space: $space, proposal: $proposal, voter: $voter }) {
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
      about
      controller
      voting_delay
      min_voting_period
      max_voting_period
      proposal_threshold
      quorum
      strategies
      authenticators
      executors
      proposal_count
      vote_count
      created
    }
  }
`;

export const SPACES_QUERY = gql`
  query ($first: Int!, $skip: Int!) {
    spaces(first: $first, skip: $skip, orderBy: vote_count, orderDirection: desc) {
      id
      name
      about
      controller
      voting_delay
      min_voting_period
      max_voting_period
      proposal_threshold
      quorum
      strategies
      authenticators
      executors
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
