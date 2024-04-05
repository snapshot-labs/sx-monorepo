import gql from 'graphql-tag';

const SPACE_FRAGMENT = gql`
  fragment offchainSpaceFragment on Space {
    id
    verified
    turbo
    admins
    members
    name
    network
    about
    website
    twitter
    github
    coingecko
    symbol
    treasuries {
      name
      network
      address
    }
    delegationPortal {
      delegationType
      delegationContract
      delegationApi
    }
    voting {
      delay
      period
      quorum
    }
    strategies {
      name
      params
      network
    }
    validation {
      name
      params
    }
    filters {
      minScore
      onlyMembers
    }
    proposalsCount
    votesCount
    followersCount
  }
`;

const PROPOSAL_FRAGMENT = gql`
  fragment offchainProposalFragment on Proposal {
    id
    ipfs
    space {
      id
      name
      network
      admins
      moderators
      symbol
    }
    type
    title
    body
    discussion
    author
    quorum
    start
    end
    snapshot
    choices
    scores
    scores_total
    state
    strategies {
      name
      params
      network
    }
    created
    updated
    votes
    privacy
  }
`;

export const PROPOSAL_QUERY = gql`
  query ($id: String!) {
    proposal(id: $id) {
      ...offchainProposalFragment
    }
  }
  ${PROPOSAL_FRAGMENT}
`;

export const PROPOSALS_QUERY = gql`
  query ($first: Int!, $skip: Int!, $where: ProposalWhere) {
    proposals(first: $first, skip: $skip, where: $where, orderBy: "created", orderDirection: desc) {
      ...offchainProposalFragment
    }
  }
  ${PROPOSAL_FRAGMENT}
`;

export const SPACES_RANKING_QUERY = gql`
  query ($first: Int, $skip: Int, $where: SpaceWhere) {
    spaces(first: $first, skip: $skip, where: $where) {
      ...offchainSpaceFragment
    }
  }
  ${SPACE_FRAGMENT}
`;

export const SPACE_QUERY = gql`
  query ($id: String!) {
    space(id: $id) {
      ...offchainSpaceFragment
    }
  }
  ${SPACE_FRAGMENT}
`;

export const USER_VOTES_QUERY = gql`
  query ($spaceId: String, $voter: String) {
    votes(where: { space: $spaceId, voter: $voter }) {
      id
      voter
      space {
        id
      }
      proposal {
        id
      }
      choice
      vp
      created
    }
  }
`;

export const VOTES_QUERY = gql`
  query (
    $first: Int!
    $skip: Int!
    $orderBy: String!
    $orderDirection: OrderDirection!
    $where: VoteWhere
  ) {
    votes(
      first: $first
      skip: $skip
      where: $where
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      voter
      space {
        id
      }
      proposal {
        id
      }
      ipfs
      choice
      vp
      created
    }
  }
`;
