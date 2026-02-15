import gql from 'graphql-tag';

const SPACE_FRAGMENT = gql`
  fragment offchainSpaceFragment on Space {
    id
    verified
    turbo
    turboExpiration
    admins
    members
    name
    avatar
    cover
    network
    about
    website
    twitter
    github
    farcaster
    coingecko
    symbol
    activeProposals
    treasuries {
      name
      network
      address
    }
    labels {
      id
      name
      description
      color
    }
    delegationPortal {
      delegationType
      delegationContract
      delegationNetwork
      delegationApi
    }
    voting {
      delay
      period
      type
      quorum
      quorumType
      privacy
      hideAbstain
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
    proposalsCount1d
    proposalsCount30d
    votesCount
    followersCount
    children {
      id
      name
      avatar
      cover
      proposalsCount
      votesCount
      followersCount
      activeProposals
      turbo
      verified
      network
    }
    parent {
      id
      name
      avatar
      cover
      proposalsCount
      votesCount
      activeProposals
      turbo
      verified
      network
    }
    # needed for settings
    terms
    private
    flagged
    flagCode
    hibernated
    domain
    skin
    skinSettings {
      bg_color
      link_color
      text_color
      content_color
      border_color
      heading_color
      primary_color
      theme
      logo
    }
    guidelines
    template
    categories
    moderators
    plugins
    boost {
      enabled
      bribeEnabled
    }
    voteValidation {
      name
      params
    }
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
      members
      symbol
      labels {
        id
        name
        description
        color
      }
      terms
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
    labels
    scores
    scores_total
    scores_state
    state
    strategies {
      name
      params
      network
    }
    validation {
      name
      params
    }
    created
    updated
    votes
    privacy
    plugins
    flagged
    flagCode
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
  query ($first: Int, $skip: Int, $spaceIds: [String], $voter: String) {
    votes(
      first: $first
      skip: $skip
      where: { space_in: $spaceIds, voter: $voter }
    ) {
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

export const SCORES_TICKS_VOTES_QUERY = gql`
  query ($first: Int!, $skip: Int!, $where: VoteWhere) {
    votes(
      first: $first
      skip: $skip
      where: $where
      orderBy: "created"
      orderDirection: asc
    ) {
      choice
      vp
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
      source
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
      votesCount
      created
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

const STRATEGY_FRAGMENT = gql`
  fragment offchainStrategyFragment on StrategyItem {
    id
    author
    about
    version
    spacesCount
    verifiedSpacesCount
    examples
    schema
    disabled
  }
`;

export const STRATEGIES_QUERY = gql`
  query Strategies {
    strategies {
      ...offchainStrategyFragment
    }
  }
  ${STRATEGY_FRAGMENT}
`;

export const STRATEGY_QUERY = gql`
  query Strategy($id: String!) {
    strategy(id: $id) {
      ...offchainStrategyFragment
    }
  }
  ${STRATEGY_FRAGMENT}
`;

export const NETWORKS_QUERY = gql`
  query Networks {
    networks {
      id
      spacesCount
      premium
    }
  }
`;

export const SETTINGS_QUERY = gql`
  query Settings {
    options {
      name
      value
    }
  }
`;
