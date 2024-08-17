import gql from 'graphql-tag';

const SPACE_FRAGMENT = gql`
  fragment offchainSpaceFragment on Space {
    id
    verified
    turbo
    admins
    members
    name
    avatar
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
      type
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
      avatar
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
    quorumType
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
    plugins
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
    proposals(
      first: $first
      skip: $skip
      where: $where
      orderBy: "created"
      orderDirection: desc
    ) {
      ...offchainProposalFragment
    }
  }
  ${PROPOSAL_FRAGMENT}
`;

export const SPACES_QUERY = gql`
  query ($first: Int, $skip: Int, $where: SpaceWhere) {
    spaces(first: $first, skip: $skip, where: $where) {
      ...offchainSpaceFragment
    }
  }
  ${SPACE_FRAGMENT}
`;

export const RANKING_QUERY = gql`
  query ($first: Int, $skip: Int, $where: RankingWhere) {
    ranking(first: $first, skip: $skip, where: $where) {
      items {
        ...offchainSpaceFragment
      }
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
  query ($spaceIds: [String], $voter: String) {
    votes(where: { space_in: $spaceIds, voter: $voter }) {
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
      reason
      created
    }
  }
`;

export const USER_FOLLOWS_QUERY = gql`
  query ($follower: String!, $first: Int) {
    follows(where: { follower: $follower }, first: $first) {
      network
      space {
        id
      }
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
      reason
      created
    }
  }
`;

export const ALIASES_QUERY = gql`
  query Aliases($address: String!, $alias: String!, $created_gt: Int) {
    aliases(
      where: { address: $address, alias: $alias, created_gt: $created_gt }
    ) {
      address
      alias
    }
  }
`;

export const STATEMENTS_QUERY = gql`
  query ($where: StatementsWhere) {
    statements(where: $where) {
      about
      statement
      space
      delegate
      network
      discourse
      status
    }
  }
`;

export const USER_QUERY = gql`
  query User($id: String!) {
    user(id: $id) {
      id
      name
      about
      avatar
      cover
      github
      twitter
      lens
      farcaster
    }
  }
`;

export const LEADERBOARD_QUERY = gql`
  query (
    $first: Int!
    $skip: Int!
    $orderBy: String
    $orderDirection: OrderDirection!
    $where: LeaderboardsWhere
  ) {
    leaderboards(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: $where
    ) {
      user
      space
      proposalsCount
      votesCount
    }
  }
`;
