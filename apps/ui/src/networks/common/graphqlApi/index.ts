import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client/core';
import {
  VOTES_QUERY,
  USER_VOTES_QUERY,
  PROPOSALS_QUERY,
  PROPOSALS_SUMMARY_QUERY,
  PROPOSAL_QUERY,
  SPACES_QUERY,
  SPACE_QUERY,
  USER_QUERY
} from './queries';
import { PaginationOpts, SpacesFilter, NetworkApi } from '@/networks/types';
import { Space, Proposal, Vote, User, Transaction, NetworkID } from '@/types';
import { ApiSpace, ApiProposal } from './types';

function formatExecution(execution: string): Transaction[] {
  if (execution === '') return [];

  try {
    const result = JSON.parse(execution);

    return Array.isArray(result) ? result : [];
  } catch (e) {
    console.log('Failed to parse execution');
    return [];
  }
}

function formatSpace(space: ApiSpace, networkId: NetworkID): Space {
  return {
    ...space,
    network: networkId,
    name: space.metadata.name,
    avatar: space.metadata.avatar,
    about: space.metadata.about,
    external_url: space.metadata.external_url,
    github: space.metadata.github,
    twitter: space.metadata.twitter,
    discord: space.metadata.discord,
    voting_power_symbol: space.metadata.voting_power_symbol,
    wallet: space.metadata.wallet,
    delegation_api_type: space.metadata.delegation_api_type,
    delegation_api_url: space.metadata.delegation_api_url,
    executors: space.metadata.executors,
    executors_types: space.metadata.executors_types,
    strategies_parsed_metadata: space.strategies_parsed_metadata.map(
      ({ data: { decimals, symbol, token } }) => ({
        decimals,
        symbol,
        token
      })
    )
  };
}

function formatProposal(
  proposal: ApiProposal,
  networkId: NetworkID,
  now: number = Date.now()
): Proposal {
  return {
    ...proposal,
    space: {
      id: proposal.space.id,
      authenticators: proposal.space.authenticators,
      voting_power_symbol: proposal.space.metadata.voting_power_symbol,
      executors: proposal.space.metadata.executors,
      executors_types: proposal.space.metadata.executors_types,
      strategies_parsed_metadata: proposal.space.strategies_parsed_metadata.map(
        ({ data: { decimals, symbol, token } }) => ({
          decimals,
          symbol,
          token
        })
      )
    },
    metadata_uri: proposal.metadata.id,
    title: proposal.metadata.title,
    body: proposal.metadata.body,
    discussion: proposal.metadata.discussion,
    execution: formatExecution(proposal.metadata.execution),
    has_started: proposal.start * 1000 >= now,
    has_execution_window_opened: proposal.min_end * 1000 <= now,
    has_ended: proposal.max_end * 1000 <= now,
    has_veto_period_ended: proposal.execution_time === 0 || proposal.execution_time * 1000 <= now,
    network: networkId
  };
}

export function createApi(uri: string, networkId: NetworkID): NetworkApi {
  const httpLink = createHttpLink({ uri });

  const apollo = new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache({
      addTypename: false
    }),
    defaultOptions: {
      query: {
        fetchPolicy: 'no-cache'
      }
    }
  });

  return {
    loadProposalVotes: async (
      proposal: Proposal,
      { limit, skip = 0 }: PaginationOpts
    ): Promise<Vote[]> => {
      const { data } = await apollo.query({
        query: VOTES_QUERY,
        variables: {
          space: proposal.space.id,
          proposal: proposal.proposal_id,
          first: limit,
          skip
        }
      });

      return data.votes;
    },
    loadUserVotes: async (voter: string): Promise<{ [key: string]: Vote }> => {
      const { data } = await apollo.query({
        query: USER_VOTES_QUERY,
        variables: {
          voter: voter.toLowerCase()
        }
      });

      return Object.fromEntries(
        (data.votes as Vote[]).map(vote => [`${networkId}:${vote.space.id}/${vote.proposal}`, vote])
      );
    },
    loadProposals: async (
      spaceId: string,
      { limit, skip = 0 }: PaginationOpts,
      searchQuery = ''
    ): Promise<Proposal[]> => {
      const { data } = await apollo.query({
        query: PROPOSALS_QUERY,
        variables: {
          space: spaceId,
          searchQuery,
          first: limit,
          skip
        }
      });

      return data.proposals.map(proposal => formatProposal(proposal, networkId));
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

      return [...data.active, ...data.expired].map(proposal =>
        formatProposal(proposal, networkId, now)
      );
    },
    loadProposal: async (spaceId: string, proposalId: number): Promise<Proposal | null> => {
      const { data } = await apollo.query({
        query: PROPOSAL_QUERY,
        variables: { id: `${spaceId}/${proposalId}` }
      });

      if (data.proposal.metadata === null) return null;

      return formatProposal(data.proposal, networkId);
    },
    loadSpaces: async (
      { limit, skip = 0 }: PaginationOpts,
      filter?: SpacesFilter
    ): Promise<Space[]> => {
      const { data } = await apollo.query({
        query: SPACES_QUERY,
        variables: {
          first: limit,
          skip,
          where: {
            ...filter,
            metadata_: {}
          }
        }
      });

      return data.spaces.map(space => formatSpace(space, networkId));
    },
    loadSpace: async (id: string): Promise<Space | null> => {
      const { data } = await apollo.query({
        query: SPACE_QUERY,
        variables: { id }
      });

      if (!data.space) return null;
      if (data.space.metadata === null) return null;

      return formatSpace(data.space, networkId);
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
