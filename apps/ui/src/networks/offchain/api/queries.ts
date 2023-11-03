import gql from 'graphql-tag';

const SPACE_FRAGMENT = gql`
  fragment spaceFragment on Space {
    id
    admins
    name
    about
    website
    twitter
    github
    symbol
    treasuries {
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
    proposalsCount
    votesCount
  }
`;

const PROPOSAL_FRAGMENT = gql`
  fragment proposalFragment on Proposal {
    id
    ipfs
    space {
      id
      name
      admins
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
    created
    updated
    votes
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
  query ($first: Int!, $skip: Int!, $where: ProposalWhere) {
    proposals(first: $first, skip: $skip, where: $where, orderBy: "created", orderDirection: desc) {
      ...proposalFragment
    }
  }
  ${PROPOSAL_FRAGMENT}
`;

export const SPACES_RANKING_QUERY = gql`
  query Ranking($first: Int, $skip: Int, $search: String, $network: String, $category: String) {
    ranking(
      first: $first
      skip: $skip
      where: { search: $search, network: $network, category: $category }
    ) {
      items {
        ...spaceFragment
      }
    }
  }
  ${SPACE_FRAGMENT}
`;

export const SPACE_QUERY = gql`
  query ($id: String!) {
    space(id: $id) {
      ...spaceFragment
    }
  }
  ${SPACE_FRAGMENT}
`;

export const PROPOSALS_SUMMARY_QUERY = gql`
  query ($first: Int!, $space: String!) {
    active: proposals(
      first: $first
      where: { space: $space, state: "active", flagged: false }
      orderBy: "created"
      orderDirection: desc
    ) {
      ...proposalFragment
    }

    expired: proposals(
      first: $first
      where: { space: $space, state: "closed", flagged: false }
      orderBy: "created"
      orderDirection: desc
    ) {
      ...proposalFragment
    }
  }

  ${PROPOSAL_FRAGMENT}
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
