import apollo from '@/helpers/apollo';
import {
  VOTES_QUERY,
  PROPOSALS_QUERY,
  PROPOSALS_SUMMARY_QUERY,
  PROPOSAL_QUERY,
  SPACES_QUERY,
  SPACE_QUERY,
  USER_QUERY
} from './queries';
import type { Space, Proposal, Vote, User } from '@/types';

type PaginationOpts = { limit: number; skip?: number };

function formatProposal(proposal: Omit<Proposal, 'has_ended'>, now: number = Date.now()): Proposal {
  return {
    ...proposal,
    has_ended: proposal.max_end * 1000 <= now
  };
}

export function createApi() {
  return {
    loadProposalVotes: async (proposal: Proposal): Promise<Vote[]> => {
      const { data } = await apollo.query({
        query: VOTES_QUERY,
        variables: {
          space: proposal.space.id,
          proposal: proposal.proposal_id
        }
      });

      return data.votes;
    },
    loadUserVotes: async (voter: string): Promise<{ [key: string]: Vote }> => {
      const { data } = await apollo.query({
        query: VOTES_QUERY,
        variables: {
          voter
        }
      });

      return Object.fromEntries(
        (data.votes as Vote[]).map(vote => [`${vote.space.id}/${vote.proposal}`, vote])
      );
    },
    loadProposals: async (
      spaceId: string,
      { limit, skip = 0 }: PaginationOpts
    ): Promise<Proposal[]> => {
      const { data } = await apollo.query({
        query: PROPOSALS_QUERY,
        variables: {
          space: spaceId,
          first: limit,
          skip
        }
      });

      return data.proposals.map(proposal => formatProposal(proposal));
    },
    loadProposalsSummary: async (spaceId: string, limit: number) => {
      const now = Date.now();

      const { data } = await apollo.query({
        query: PROPOSALS_SUMMARY_QUERY,
        variables: {
          first: limit,
          space: spaceId,
          threshold: Math.floor(now / 1000)
        }
      });

      return [...data.active, ...data.expired].map(proposal => formatProposal(proposal, now));
    },
    loadProposal: async (spaceId: string, proposalId: number): Promise<Proposal> => {
      const { data } = await apollo.query({
        query: PROPOSAL_QUERY,
        variables: { id: `${spaceId}/${proposalId}` }
      });

      return formatProposal(data.proposal);
    },
    loadSpaces: async ({ limit, skip = 0 }: PaginationOpts): Promise<Space[]> => {
      const { data } = await apollo.query({
        query: SPACES_QUERY,
        variables: {
          first: limit,
          skip
        }
      });

      return data.spaces;
    },
    loadSpace: async (id: string): Promise<Space> => {
      const { data } = await apollo.query({
        query: SPACE_QUERY,
        variables: { id }
      });

      return data.space;
    },
    loadUser: async (id: string): Promise<User> => {
      const { data } = await apollo.query({
        query: USER_QUERY,
        variables: { id }
      });

      return data.user;
    }
  };
}
