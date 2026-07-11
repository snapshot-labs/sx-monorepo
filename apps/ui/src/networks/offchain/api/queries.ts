import { gql } from './gql';

gql(`
  fragment offchainRelatedSpaceFragment on Space {
    id
    name
    avatar
    cover
    network
    proposalsCount
    votesCount
    followersCount
    activeProposals
    turbo
    verified
  }

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
      ...offchainRelatedSpaceFragment
    }
    parent {
      ...offchainRelatedSpaceFragment
    }
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
    app
  }

  fragment offchainVoteFragment on Vote {
    id
    ipfs
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
    app
  }

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
`);

export const PROPOSAL_QUERY = gql(`
  query Proposal($id: String!) {
    proposal(id: $id) {
      ...offchainProposalFragment
    }
  }
`);

export const PROPOSALS_QUERY = gql(`
  query Proposals($first: Int!, $skip: Int!, $where: ProposalWhere) {
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
`);

export const SPACES_QUERY = gql(`
  query Spaces($first: Int!, $skip: Int!, $where: SpaceWhere) {
    spaces(first: $first, skip: $skip, where: $where) {
      ...offchainSpaceFragment
    }
  }
`);

export const RANKING_QUERY = gql(`
  query Ranking($first: Int!, $skip: Int!, $where: RankingWhere) {
    ranking(first: $first, skip: $skip, where: $where) {
      items {
        ...offchainSpaceFragment
      }
    }
  }
`);

export const SPACE_QUERY = gql(`
  query Space($id: String!) {
    space(id: $id) {
      ...offchainSpaceFragment
    }
  }
`);

export const USER_VOTES_QUERY = gql(`
  query UserVotes($first: Int!, $skip: Int!, $spaceIds: [String], $voter: String) {
    votes(
      first: $first
      skip: $skip
      where: { space_in: $spaceIds, voter: $voter }
    ) {
      ...offchainVoteFragment
    }
  }
`);

export const USER_FOLLOWS_QUERY = gql(`
  query UserFollows($follower: String!, $first: Int!) {
    follows(where: { follower: $follower }, first: $first) {
      network
      space {
        id
      }
    }
  }
`);

export const VOTES_QUERY = gql(`
  query Votes(
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
      ...offchainVoteFragment
    }
  }
`);

export const SCORES_TICKS_VOTES_QUERY = gql(`
  query ScoresTicksVotes($first: Int!, $skip: Int!, $where: VoteWhere) {
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
`);

export const ALIASES_QUERY = gql(`
  query Aliases($address: String!, $alias: String!, $created_gt: Int) {
    aliases(
      where: { address: $address, alias: $alias, created_gt: $created_gt }
    ) {
      address
      alias
    }
  }
`);

export const ALIASES_BY_ADDRESS_QUERY = gql(`
  query AliasesByAddress($address: String!) {
    aliases(
      first: 1000
      where: { address: $address }
      orderBy: "created"
      orderDirection: desc
    ) {
      address
      alias
      created
    }
  }
`);

export const STATEMENTS_QUERY = gql(`
  query Statements($where: StatementsWhere) {
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
`);

export const USER_QUERY = gql(`
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
`);

export const LEADERBOARD_QUERY = gql(`
  query Leaderboard(
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
`);

export const STRATEGIES_QUERY = gql(`
  query Strategies {
    strategies {
      ...offchainStrategyFragment
    }
  }
`);

export const STRATEGY_QUERY = gql(`
  query Strategy($id: String!) {
    strategy(id: $id) {
      ...offchainStrategyFragment
    }
  }
`);

export const NETWORKS_QUERY = gql(`
  query Networks {
    networks {
      id
      spacesCount
      premium
    }
  }
`);

export const SETTINGS_QUERY = gql(`
  query Settings {
    options {
      name
      value
    }
  }
`);
