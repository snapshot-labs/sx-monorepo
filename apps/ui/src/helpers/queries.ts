import gql from 'graphql-tag';

export const PROPOSAL_QUERY = gql`
  query ($id: String!) {
    proposal(id: $id) {
      id
      proposal_id
      space
      author
      metadata_uri
      title
      body
      discussion
      start
      end
      snapshot
      scores_1
      scores_2
      scores_3
      scores_total
      created
      tx
      vote_count
    }
  }
`;

export const PROPOSALS_QUERY = gql`
  query ($first: Int!) {
    proposals(first: $first, orderBy: created, orderDirection: desc) {
      id
      proposal_id
      space
      author
      metadata_uri
      title
      body
      discussion
      start
      end
      snapshot
      scores_1
      scores_2
      scores_3
      scores_total
      created
      tx
      vote_count
    }
  }
`;

export const VOTES_QUERY = gql`
  query ($space: String, $proposal: Int, $voter: String) {
    votes(where: { space: $space, proposal: $proposal, voter: $voter }) {
      id
      voter
      space
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
      voting_delay
      voting_period
      proposal_threshold
      proposal_count
      vote_count
    }
  }
`;

export const SPACES_QUERY = gql`
  query {
    spaces {
      id
      name
      proposal_count
      vote_count
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
