import {
  ApolloClient,
  createHttpLink,
  InMemoryCache
} from '@apollo/client/core';
import { BASIC_CHOICES, CHAIN_IDS } from '@/helpers/constants';
import { getNames } from '@/helpers/stamp';
import { clone, compareAddresses } from '@/helpers/utils';
import {
  NetworkApi,
  NetworkConstants,
  PaginationOpts,
  ProposalsFilter,
  SpacesFilter
} from '@/networks/types';
import {
  Follow,
  NetworkID,
  Proposal,
  ProposalExecution,
  ProposalState,
  Space,
  Transaction,
  User,
  UserActivity,
  Vote
} from '@/types';
import {
  PROPOSAL_QUERY as HIGHLIGHT_PROPOSAL_QUERY,
  PROPOSALS_QUERY as HIGHLIGHT_PROPOSALS_QUERY,
  SPACE_QUERY as HIGHLIGHT_SPACE_QUERY,
  SPACES_QUERY as HIGHLIGHT_SPACES_QUERY,
  USER_QUERY as HIGHLIGHT_USER_QUERY,
  VOTES_QUERY as HIGHLIGHT_VOTES_QUERY,
  joinHighlightProposal,
  joinHighlightSpace,
  joinHighlightUser,
  mixinHighlightVotes
} from './highlight';
import {
  LEADERBOARD_QUERY,
  PROPOSAL_QUERY,
  PROPOSALS_QUERY,
  SPACE_QUERY,
  SPACES_QUERY,
  USER_QUERY,
  USER_VOTES_QUERY,
  VOTES_QUERY
} from './queries';
import { ApiProposal, ApiSpace, ApiStrategyParsedMetadata } from './types';

type ApiOptions = {
  baseNetworkId?: NetworkID;
  highlightApiUrl?: string;
};

function getProposalState(
  proposal: ApiProposal,
  current: number
): ProposalState {
  // we have broken types, we should unify, this is quick fix for Nimbora PR
  // those values are actually strings
  // https://github.com/snapshot-labs/sx-monorepo/pull/529/files#r1691071502
  const quorum = BigInt(proposal.quorum);
  const scoresTotal = BigInt(proposal.scores_total);
  const scoresFor = BigInt(proposal.scores_1);
  const scoresAgainst = BigInt(proposal.scores_2);

  if (proposal.executed) return 'executed';
  if (proposal.max_end <= current) {
    if (scoresTotal < quorum) return 'rejected';
    return scoresFor > scoresAgainst ? 'passed' : 'rejected';
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
        id: metadata.data.id,
        name: metadata.data.name,
        description: metadata.data.description,
        decimals: metadata.data.decimals,
        symbol: metadata.data.symbol,
        token: metadata.data.token,
        payload: metadata.data.payload
      }
    ])
  );

  strategiesIndicies =
    strategiesIndicies || Array.from(Array(maxIndex + 1).keys());
  return strategiesIndicies.map(index => metadataMap[index]) || [];
}

function processExecutions(
  proposal: ApiProposal,
  executionNetworkId: NetworkID
): ProposalExecution[] {
  // NOTE: This is unstable, meaning that if executors_strategies or treasuries
  // are modified in the future it will affect pass proposals.
  // We should persist those values on proposal directly so it's stable.
  // Right now we can't really update subgraphs because of TheGraph issue.

  const transactions = formatExecution(proposal.metadata.execution);
  if (transactions.length === 0) return [];

  const match = proposal.space.metadata.executors_strategies.find(
    strategy => strategy.address === proposal.execution_strategy
  );

  const treasuries = proposal.space.metadata.treasuries.map(treasury => {
    const { name, network, address } = JSON.parse(treasury);

    return {
      name,
      network,
      address
    };
  });

  const matchingTreasury = treasuries.find(treasury => {
    if (!match) return null;

    return (
      match.treasury &&
      compareAddresses(treasury.address, match.treasury) &&
      match.treasury_chain === CHAIN_IDS[treasury.network]
    );
  });

  return [
    {
      strategyType: match?.type || '',
      safeAddress: match?.treasury || '',
      safeName: matchingTreasury?.name || 'Unnamed treasury',
      networkId: matchingTreasury?.network || executionNetworkId,
      transactions
    }
  ];
}

function formatSpace(
  space: ApiSpace,
  networkId: NetworkID,
  constants: NetworkConstants
): Space {
  return {
    ...space,
    network: networkId,
    name: space.metadata.name,
    avatar: space.metadata.avatar,
    cover: space.metadata.cover,
    about: space.metadata.about,
    external_url: space.metadata.external_url,
    github: space.metadata.github,
    twitter: space.metadata.twitter,
    discord: space.metadata.discord,
    voting_power_symbol: space.metadata.voting_power_symbol,
    voting_types: constants.EDITOR_VOTING_TYPES,
    treasuries: space.metadata.treasuries.map(treasury => {
      const { name, network, address } = JSON.parse(treasury);

      return {
        name,
        network,
        address,
        chainId: CHAIN_IDS[network]
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
        contractAddress: address === 'null' ? null : address,
        chainId: CHAIN_IDS[network]
      };
    }),
    executors: space.metadata.executors,
    executors_types: space.metadata.executors_types,
    executors_destinations: space.metadata.executors_destinations,
    executors_strategies: space.metadata.executors_strategies,
    voting_power_validation_strategies_parsed_metadata:
      processStrategiesMetadata(
        space.voting_power_validation_strategies_parsed_metadata
      ),
    strategies_parsed_metadata: processStrategiesMetadata(
      space.strategies_parsed_metadata,
      space.strategies_indicies
    ),
    children: [],
    parent: null
  };
}

function formatProposal(
  proposal: ApiProposal,
  networkId: NetworkID,
  current: number,
  baseNetworkId?: NetworkID
): Proposal {
  const executionNetworkId =
    proposal.execution_strategy_type === 'EthRelayer' && baseNetworkId
      ? baseNetworkId
      : networkId;

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
    labels: [],
    scores: [proposal.scores_1, proposal.scores_2, proposal.scores_3],
    title: proposal.metadata.title,
    body: proposal.metadata.body,
    discussion: proposal.metadata.discussion,
    execution_network: executionNetworkId,
    executions: processExecutions(proposal, executionNetworkId),
    has_execution_window_opened: ['Axiom', 'EthRelayer'].includes(
      proposal.execution_strategy_type
    )
      ? proposal.max_end <= current
      : proposal.min_end <= current,
    state: getProposalState(proposal, current),
    network: networkId,
    privacy: null,
    quorum: +proposal.quorum
  };
}

export function createApi(
  uri: string,
  networkId: NetworkID,
  constants: NetworkConstants,
  opts: ApiOptions = {}
): NetworkApi {
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
    apiUrl: uri,
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

      const [orderBy, orderDirection] = sortBy.split('-') as [
        'vp' | 'created',
        'desc' | 'asc'
      ];

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
            variables: {
              space: proposal.space.id,
              proposal: proposal.proposal_id
            }
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
        vote.reason = vote.metadata?.reason;
        delete vote.metadata;

        return vote;
      });
    },
    loadUserVotes: async (
      spaceIds: string[],
      voter: string,
      { limit, skip = 0 }: PaginationOpts
    ): Promise<{ [key: string]: Vote }> => {
      const { data } = await apollo.query({
        query: USER_VOTES_QUERY,
        variables: {
          spaceIds,
          voter,
          first: limit,
          skip
        }
      });

      return Object.fromEntries(
        (data.votes as Vote[]).map(vote => [
          `${networkId}:${vote.space.id}/${vote.proposal}`,
          vote
        ])
      );
    },
    loadProposals: async (
      spaceIds: string[],
      { limit, skip = 0 }: PaginationOpts,
      current: number,
      filters?: ProposalsFilter,
      searchQuery = ''
    ): Promise<Proposal[]> => {
      const _filters: Record<string, any> = clone(filters || {});
      const state = _filters.state;

      if (state === 'active') {
        _filters.start_lte = current;
        _filters.max_end_gte = current;
      } else if (state === 'pending') {
        _filters.start_gt = current;
      } else if (state === 'closed') {
        _filters.max_end_lt = current;
      }

      delete _filters.state;

      const { data } = await apollo.query({
        query: PROPOSALS_QUERY,
        variables: {
          first: limit,
          skip,
          where: {
            space_in: spaceIds,
            cancelled: false,
            metadata_: { title_contains_nocase: searchQuery },
            ..._filters
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

      return data.proposals.map(proposal =>
        formatProposal(proposal, networkId, current, opts.baseNetworkId)
      );
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

      if (data.proposal?.metadata === null) return null;
      data.proposal = joinHighlightProposal(
        data.proposal,
        highlightResult?.data.sxproposal
      );

      if (!data.proposal) return null;

      return formatProposal(
        data.proposal,
        networkId,
        current,
        opts.baseNetworkId
      );
    },
    loadSpaces: async (
      { limit, skip = 0 }: PaginationOpts,
      filter?: SpacesFilter
    ): Promise<Space[]> => {
      const _filter: Record<string, any> = clone(filter || {});

      if (_filter.searchQuery) {
        _filter.metadata_ = { name_contains_nocase: _filter.searchQuery };
      }
      delete _filter.searchQuery;

      const { data } = await apollo.query({
        query: SPACES_QUERY,
        variables: {
          first: limit,
          skip,
          where: {
            metadata_: {},
            ..._filter
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

      return data.spaces.map(space => formatSpace(space, networkId, constants));
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

      data.space = joinHighlightSpace(
        data.space,
        highlightResult?.data.sxspace
      );

      return formatSpace(data.space, networkId, constants);
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

      return joinHighlightUser(
        data.user ?? null,
        highlightResult?.data?.sxuser ?? null
      );
    },
    loadUserActivities(userId: string): Promise<UserActivity[]> {
      return apollo
        .query({
          query: LEADERBOARD_QUERY,
          variables: {
            first: 1000,
            skip: 0,
            orderBy: 'proposal_count',
            orderDirection: 'desc',
            where: {
              user: userId
            }
          }
        })
        .then(({ data }) =>
          data.leaderboards.map((leaderboard: any) => ({
            spaceId: `${networkId}:${leaderboard.space.id}`,
            vote_count: leaderboard.vote_count,
            proposal_count: leaderboard.proposal_count
          }))
        );
    },
    loadLeaderboard(
      spaceId: string,
      { limit, skip = 0 }: PaginationOpts,
      sortBy:
        | 'vote_count-desc'
        | 'vote_count-asc'
        | 'proposal_count-desc'
        | 'proposal_count-asc' = 'vote_count-desc',
      user?: string
    ): Promise<UserActivity[]> {
      const [orderBy, orderDirection] = sortBy.split('-') as [
        'vote_count' | 'proposal_count',
        'desc' | 'asc'
      ];

      return apollo
        .query({
          query: LEADERBOARD_QUERY,
          variables: {
            first: limit,
            skip,
            orderBy,
            orderDirection,
            where: {
              space: spaceId,
              user
            }
          }
        })
        .then(({ data }) =>
          data.leaderboards.map((leaderboard: any) => ({
            id: leaderboard.user.id,
            spaceId: leaderboard.space.id,
            vote_count: leaderboard.vote_count,
            proposal_count: leaderboard.proposal_count
          }))
        );
    },
    loadFollows: async () => {
      return [] as Follow[];
    },
    loadAlias: async () => {
      return null;
    },
    loadStatement: async () => {
      return null;
    },
    loadStatements: async () => {
      return [];
    },
    loadStrategies: async () => {
      return [];
    },
    loadStrategy: async () => {
      return null;
    }
  };
}
