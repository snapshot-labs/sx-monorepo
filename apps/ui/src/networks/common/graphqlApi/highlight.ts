import gql from 'graphql-tag';
import { ApiSpace, ApiProposal } from './types';
import { User, Vote } from '@/types';

type HighlightSpace = {
  id: string;
  vote_count: number;
};

type HighlightProposal = {
  id: string;
  scores_1: string;
  scores_2: string;
  scores_3: string;
  scores_total: string;
  vote_count: number;
};

const SPACE_FRAGMENT = gql`
  fragment highlightSpaceFragment on SXSpace {
    id
    vote_count
  }
`;

const PROPOSAL_FRAGMENT = gql`
  fragment highlightProposalFragment on SXProposal {
    id
    scores_1
    scores_2
    scores_3
    scores_total
    vote_count
  }
`;

export const SPACE_QUERY = gql`
  query ($id: String!) {
    sxspace(id: $id) {
      ...highlightSpaceFragment
    }
  }
  ${SPACE_FRAGMENT}
`;

export const SPACES_QUERY = gql`
  query ($ids: [String!]!) {
    sxspaces(where: { id_in: $ids }) {
      ...highlightSpaceFragment
    }
  }
  ${SPACE_FRAGMENT}
`;

export const PROPOSAL_QUERY = gql`
  query ($id: String!) {
    sxproposal(id: $id) {
      ...highlightProposalFragment
    }
  }
  ${PROPOSAL_FRAGMENT}
`;

export const PROPOSALS_QUERY = gql`
  query ($ids: [String!]!) {
    sxproposals(where: { id_in: $ids }) {
      ...highlightProposalFragment
    }
  }
  ${PROPOSAL_FRAGMENT}
`;

export const VOTES_QUERY = gql`
  query ($space: String!, $proposal: Int!) {
    votes(where: { space: $space, proposal: $proposal }) {
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
      tx
    }
  }
`;

export const USER_QUERY = gql`
  query ($id: String!) {
    sxuser(id: $id) {
      id
      proposal_count
      vote_count
      created
    }
  }
`;

export function joinHighlightSpace(
  space: ApiSpace,
  highlightSpace: HighlightSpace | null
): ApiSpace {
  if (!highlightSpace) return space;

  return {
    ...space,
    vote_count: space.vote_count + highlightSpace.vote_count
  };
}

export function joinHighlightProposal(
  proposal: ApiProposal,
  highlightProposal: HighlightProposal | null
): ApiProposal {
  if (!highlightProposal) return proposal;

  return {
    ...proposal,
    scores_1: Number(BigInt(proposal.scores_1) + BigInt(highlightProposal.scores_1)),
    scores_2: Number(BigInt(proposal.scores_2) + BigInt(highlightProposal.scores_2)),
    scores_3: Number(BigInt(proposal.scores_3) + BigInt(highlightProposal.scores_3)),
    scores_total: Number(BigInt(proposal.scores_total) + BigInt(highlightProposal.scores_total)),
    vote_count: proposal.vote_count + highlightProposal.vote_count
  };
}

export function joinHighlightUser(user: User | null, highlightUser: User | null): User | null {
  if (!highlightUser) return user;

  return {
    ...user,
    ...highlightUser,
    vote_count: user ? user.vote_count + highlightUser.vote_count : highlightUser.vote_count
  };
}

export function mixinHighlightVotes(
  votes: Vote[],
  highlightVotes: Vote[],
  filter: 'any' | 'for' | 'against' | 'abstain',
  orderBy: 'created' | 'vp',
  orderDirection: 'desc' | 'asc',
  limit: number
): { result: Vote[]; remaining: Vote[] } {
  if (!highlightVotes.length) return { result: votes, remaining: [] };

  const filteredHighlightVotes = highlightVotes.filter(vote => {
    if (filter === 'for') return vote.choice === 1;
    if (filter === 'against') return vote.choice === 2;
    if (filter === 'abstain') return vote.choice === 3;
    return true;
  });

  const hasMore = votes.length === limit;
  const thresholdValue = votes.length > 0 ? votes[votes.length - 1][orderBy] : null;

  const mixins =
    !hasMore || thresholdValue === null
      ? { added: filteredHighlightVotes, remaining: [] }
      : filteredHighlightVotes.reduce(
          (res, vote) => {
            const valid =
              orderDirection === 'desc'
                ? vote[orderBy] >= thresholdValue
                : vote[orderBy] < thresholdValue;

            if (valid) res.added.push(vote);
            else res.remaining.push(vote);

            return res;
          },
          { added: [] as Vote[], remaining: [] as Vote[] }
        );

  const result = [...votes, ...mixins.added].sort((a, b) =>
    orderDirection === 'desc' ? b[orderBy] - a[orderBy] : a[orderBy] - b[orderBy]
  );

  return { result, remaining: mixins.remaining };
}
