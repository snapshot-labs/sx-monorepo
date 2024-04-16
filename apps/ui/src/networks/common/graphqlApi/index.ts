import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client/core';
import {
  VOTES_QUERY,
  USER_VOTES_QUERY,
  PROPOSALS_QUERY,
  PROPOSAL_QUERY,
  SPACES_QUERY,
  SPACE_QUERY,
  USER_QUERY
} from './queries';
import {
  SPACES_QUERY as HIGHLIGHT_SPACES_QUERY,
  SPACE_QUERY as HIGHLIGHT_SPACE_QUERY,
  PROPOSALS_QUERY as HIGHLIGHT_PROPOSALS_QUERY,
  PROPOSAL_QUERY as HIGHLIGHT_PROPOSAL_QUERY,
  VOTES_QUERY as HIGHLIGHT_VOTES_QUERY,
  USER_QUERY as HIGHLIGHT_USER_QUERY,
  joinHighlightSpace,
  joinHighlightProposal,
  mixinHighlightVotes,
  joinHighlightUser
} from './highlight';
import { PaginationOpts, SpacesFilter, NetworkApi } from '@/networks/types';
import { getNames } from '@/helpers/stamp';
import { BASIC_CHOICES } from '@/helpers/constants';
import { Space, Proposal, Vote, User, Transaction, NetworkID, ProposalState } from '@/types';
import { ApiSpace, ApiProposal, ApiStrategyParsedMetadata } from './types';

type ApiOptions = {
  highlightApiUrl?: string;
};

function getProposalState(proposal: ApiProposal, current: number): ProposalState {
  if (proposal.executed) return 'executed';
  if (proposal.max_end <= current) {
    if (proposal.scores_total < proposal.quorum) return 'rejected';
    return proposal.scores_1 > proposal.scores_2 ? 'passed' : 'rejected';
  }
  if (proposal.start > current) return 'pending';

  return 'active';
}

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

function processStrategiesMetadata(
  parsedMetadata: ApiStrategyParsedMetadata[],
  strategiesIndicies?: number[]
) {
  if (parsedMetadata.length === 0) return [];

  const maxIndex = Math.max(...parsedMetadata.map(metadata => metadata.index));

  const metadataMap = Object.fromEntries(
    parsedMetadata.map(metadata => [
      metadata.index,
      {
        name: metadata.data.name,
        description: metadata.data.description,
        decimals: metadata.data.decimals,
        symbol: metadata.data.symbol,
        token: metadata.data.token,
        payload: metadata.data.payload
      }
    ])
  );

  strategiesIndicies = strategiesIndicies || Array.from(Array(maxIndex + 1).keys());
  return strategiesIndicies.map(index => metadataMap[index]) || [];
}

function formatSpace(space: ApiSpace, networkId: NetworkID): Space {
  return {
    ...space,
    network: networkId,
    verified: false,
    turbo: false,
    name: space.metadata.name,
    avatar: space.metadata.avatar,
    cover: space.metadata.cover,
    about: space.metadata.about,
    external_url: space.metadata.external_url,
    github: space.metadata.github,
    twitter: space.metadata.twitter,
    discord: space.metadata.discord,
    voting_power_symbol: space.metadata.voting_power_symbol,
    treasuries: space.metadata.treasuries.map(treasury => {
      const { name, network, address } = JSON.parse(treasury);

      return {
        name,
        network,
        address
      };
    }),
    delegations: space.metadata.delegations.map(delegation => {
      const { name, api_type, api_url, contract } = JSON.parse(delegation);

      const [network, address] = contract.split(':');

      return {
        name: name,
        apiType: api_type,
        apiUrl: api_url,
        contractNetwork: network === 'null' ? null : network,
        contractAddress: address === 'null' ? null : address
      };
    }),
    executors: space.metadata.executors,
    executors_types: space.metadata.executors_types,
    executors_strategies: space.metadata.executors_strategies,
    voting_power_validation_strategies_parsed_metadata: processStrategiesMetadata(
      space.voting_power_validation_strategies_parsed_metadata
    ),
    strategies_parsed_metadata: processStrategiesMetadata(
      space.strategies_parsed_metadata,
      space.strategies_indicies
    )
  };
}

function formatProposal(proposal: ApiProposal, networkId: NetworkID, current: number): Proposal {
  return {
    ...proposal,
    space: {
      id: proposal.space.id,
      name: proposal.space.metadata.name,
      avatar: proposal.space.metadata.avatar,
      controller: proposal.space.controller,
      authenticators: proposal.space.authenticators,
      voting_power_symbol: proposal.space.metadata.voting_power_symbol,
      executors: proposal.space.metadata.executors,
      executors_types: proposal.space.metadata.executors_types,
      strategies_parsed_metadata: processStrategiesMetadata(
        proposal.space.strategies_parsed_metadata,
        proposal.strategies_indicies
      )
    },
    metadata_uri: proposal.metadata.id,
    type: 'basic',
    choices: BASIC_CHOICES,
    scores: [proposal.scores_1, proposal.scores_2, proposal.scores_3],
    title: proposal.metadata.title,
    body: proposal.metadata.body,
    discussion: proposal.metadata.discussion,
    execution: formatExecution(proposal.metadata.execution),
    has_execution_window_opened:
      proposal.execution_strategy_type === 'Axiom'
        ? proposal.max_end <= current
        : proposal.min_end <= current,
    state: getProposalState(proposal, current),
    network: networkId,
    privacy: null
  };
}

export function createApi(uri: string, networkId: NetworkID, opts: ApiOptions = {}): NetworkApi {
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

  const highlightApolloClient = opts.highlightApiUrl
    ? new ApolloClient({
        link: createHttpLink({ uri: opts.highlightApiUrl }),
        cache: new InMemoryCache({
          addTypename: false
        }),
        defaultOptions: {
          query: {
            fetchPolicy: 'no-cache'
          }
        }
      })
    : null;

  const highlightVotesCache = {
    key: null as string | null,
    data: [] as Vote[],
    remaining: [] as Vote[]
  };

  return {
    loadProposalVotes: async (
      proposal: Proposal,
      { limit, skip = 0 }: PaginationOpts,
      filter: 'any' | 'for' | 'against' | 'abstain' = 'any',
      sortBy: 'vp-desc' | 'vp-asc' | 'created-desc' | 'created-asc' = 'vp-desc'
    ): Promise<Vote[]> => {
      const filters: Record<string, any> = {};
      if (filter === 'for') {
        filters.choice = 1;
      } else if (filter === 'against') {
        filters.choice = 2;
      } else if (filter === 'abstain') {
        filters.choice = 3;
      }

      const [orderBy, orderDirection] = sortBy.split('-') as ['vp' | 'created', 'desc' | 'asc'];

      const { data } = await apollo.query({
        query: VOTES_QUERY,
        variables: {
          first: limit,
          skip,
          orderBy,
          orderDirection,
          where: {
            space: proposal.space.id,
            proposal: proposal.proposal_id,
            ...filters
          }
        }
      });

      if (highlightApolloClient) {
        const cacheKey = `${proposal.space.id}/${proposal.proposal_id}`;
        const cacheValid = highlightVotesCache.key === cacheKey;

        if (!cacheValid) {
          const { data: highlightData } = await highlightApolloClient.query({
            query: HIGHLIGHT_VOTES_QUERY,
            variables: { space: proposal.space.id, proposal: proposal.proposal_id }
          });

          highlightVotesCache.key = cacheKey;
          highlightVotesCache.data = highlightData.votes;
          highlightVotesCache.remaining = highlightData.votes;
        } else if (skip === 0) {
          highlightVotesCache.remaining = highlightVotesCache.data;
        }

        const { result, remaining } = mixinHighlightVotes(
          data.votes,
          highlightVotesCache.remaining,
          filter,
          orderBy,
          orderDirection,
          limit
        );

        highlightVotesCache.remaining = remaining;

        data.votes = result;
      }

      const addresses = data.votes.map(vote => vote.voter.id);
      const names = await getNames(addresses);

      return data.votes.map(vote => {
        vote.voter.name = names[vote.voter.id] || null;
        return vote;
      });
    },
    loadUserVotes: async (spaceId: string, voter: string): Promise<{ [key: string]: Vote }> => {
      const { data } = await apollo.query({
        query: USER_VOTES_QUERY,
        variables: {
          spaceId,
          voter
        }
      });

      return Object.fromEntries(
        (data.votes as Vote[]).map(vote => [`${networkId}:${vote.space.id}/${vote.proposal}`, vote])
      );
    },
    loadProposals: async (
      spaceId: string,
      { limit, skip = 0 }: PaginationOpts,
      current: number,
      filter: 'any' | 'active' | 'pending' | 'closed' = 'any',
      searchQuery = ''
    ): Promise<Proposal[]> => {
      const filters: Record<string, any> = {};
      if (filter === 'active') {
        filters.start_lte = current;
        filters.max_end_gte = current;
      } else if (filter === 'pending') {
        filters.start_gt = current;
      } else if (filter === 'closed') {
        filters.max_end_lt = current;
      }

      const { data } = await apollo.query({
        query: PROPOSALS_QUERY,
        variables: {
          first: limit,
          skip,
          where: {
            space: spaceId,
            cancelled: false,
            metadata_: { title_contains_nocase: searchQuery },
            ...filters
          }
        }
      });

      if (highlightApolloClient) {
        const { data: highlightData } = await highlightApolloClient.query({
          query: HIGHLIGHT_PROPOSALS_QUERY,
          variables: { ids: data.proposals.map(proposal => proposal.id) }
        });

        data.proposals = data.proposals.map(proposal => {
          const highlightProposal = highlightData.sxproposals.find(
            (highlightProposal: any) => highlightProposal.id === proposal.id
          );

          return joinHighlightProposal(proposal, highlightProposal);
        });
      }

      return data.proposals.map(proposal => formatProposal(proposal, networkId, current));
    },
    loadProposal: async (
      spaceId: string,
      proposalId: number,
      current: number
    ): Promise<Proposal | null> => {
      const [{ data }, highlightResult] = await Promise.all([
        apollo.query({
          query: PROPOSAL_QUERY,
          variables: { id: `${spaceId}/${proposalId}` }
        }),
        highlightApolloClient
          ?.query({
            query: HIGHLIGHT_PROPOSAL_QUERY,
            variables: { id: `${spaceId}/${proposalId}` }
          })
          .catch(() => null)
      ]);

      if (data.proposal.metadata === null) return null;
      data.proposal = joinHighlightProposal(data.proposal, highlightResult?.data.sxproposal);

      return formatProposal(data.proposal, networkId, current);
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

      if (highlightApolloClient) {
        const { data: highlightData } = await highlightApolloClient.query({
          query: HIGHLIGHT_SPACES_QUERY,
          variables: { ids: data.spaces.map((space: any) => space.id) }
        });

        data.spaces = data.spaces.map((space: ApiSpace) => {
          const highlightSpace = highlightData.sxspaces.find(
            (highlightSpace: any) => highlightSpace.id === space.id
          );

          return joinHighlightSpace(space, highlightSpace);
        });
      }

      return data.spaces.map(space => formatSpace(space, networkId));
    },
    loadSpace: async (id: string): Promise<Space | null> => {
      const [{ data }, highlightResult] = await Promise.all([
        apollo.query({
          query: SPACE_QUERY,
          variables: { id }
        }),
        highlightApolloClient
          ?.query({
            query: HIGHLIGHT_SPACE_QUERY,
            variables: { id }
          })
          .catch(() => null)
      ]);

      data.space = joinHighlightSpace(data.space, highlightResult?.data.sxspace);

      return formatSpace(data.space, networkId);
    },
    loadUser: async (id: string): Promise<User | null> => {
      const [{ data }, highlightResult] = await Promise.all([
        apollo.query({
          query: USER_QUERY,
          variables: { id }
        }),
        highlightApolloClient
          ?.query({
            query: HIGHLIGHT_USER_QUERY,
            variables: { id }
          })
          .catch(() => null)
      ]);

      return joinHighlightUser(data.user ?? null, highlightResult?.data?.sxuser ?? null);
    }
  };
}
