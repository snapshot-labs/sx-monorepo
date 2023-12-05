import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client/core';
import {
  SPACES_RANKING_QUERY,
  SPACE_QUERY,
  PROPOSALS_QUERY,
  PROPOSAL_QUERY,
  VOTES_QUERY
} from './queries';
import { PaginationOpts, SpacesFilter, NetworkApi } from '@/networks/types';
import { getNames } from '@/helpers/stamp';
import { Space, Proposal, Vote, User, NetworkID, ProposalState } from '@/types';
import { ApiSpace, ApiProposal, ApiVote } from './types';

function getProposalState(proposal: ApiProposal): ProposalState {
  if (proposal.state === 'closed') {
    if (proposal.scores_total < proposal.quorum) return 'rejected';
    return proposal.type !== 'basic' || proposal.scores[0] > proposal.scores[1]
      ? 'passed'
      : 'rejected';
  }

  return proposal.state;
}

function formatSpace(space: ApiSpace, networkId: NetworkID): Space {
  // TODO: convert ChainID to ShortName, we might need external mapping to handle
  // all of those - or just have simple map with limited support
  const wallet = space.treasuries[0] ? `eth:${space.treasuries[0].address}` : '';

  return {
    id: space.id,
    controller: space.admins[0] ?? '',
    network: networkId,
    name: space.name,
    avatar: '',
    cover: '',
    about: space.about,
    external_url: space.website,
    github: space.github,
    twitter: space.twitter,
    discord: '',
    proposal_count: space.proposalsCount,
    vote_count: space.votesCount,
    voting_power_symbol: space.symbol,
    voting_delay: space.voting.delay ?? 0,
    min_voting_period: space.voting.period ?? 0,
    max_voting_period: space.voting.period ?? 0,
    proposal_threshold: space.voting.quorum?.toString() ?? '0',
    wallet,
    delegation_api_type: space.delegationPortal?.delegationType ?? null,
    delegation_api_url: space.delegationPortal?.delegationApi ?? null,
    delegation_contract: space.delegationPortal?.delegationContract ?? null,
    // NOTE: ignored
    created: 0,
    authenticators: [],
    executors: [],
    executors_types: [],
    strategies: [],
    strategies_indicies: [],
    strategies_params: [],
    strategies_parsed_metadata: [],
    validation_strategy: '',
    validation_strategy_params: '',
    voting_power_validation_strategy_strategies: [],
    voting_power_validation_strategy_strategies_params: [],
    voting_power_validation_strategies_parsed_metadata: []
  };
}

function formatProposal(proposal: ApiProposal, networkId: NetworkID): Proposal {
  return {
    id: proposal.id,
    network: networkId,
    metadata_uri: proposal.ipfs,
    author: {
      id: proposal.author
    },
    proposal_id: proposal.id,
    type: proposal.type,
    title: proposal.title,
    body: proposal.body,
    discussion: proposal.discussion,
    created: proposal.created,
    edited: proposal.updated,
    start: proposal.start,
    min_end: proposal.end,
    max_end: proposal.end,
    snapshot: proposal.snapshot,
    quorum: proposal.quorum,
    choices: proposal.choices,
    scores: proposal.scores,
    scores_total: proposal.scores_total,
    vote_count: proposal.votes,
    state: getProposalState(proposal),
    cancelled: false,
    vetoed: false,
    completed: proposal.state === 'closed',
    space: {
      id: proposal.space.id,
      name: proposal.space.name,
      avatar: '',
      controller: proposal.space.admins[0] ?? '',
      voting_power_symbol: proposal.space.symbol,
      authenticators: [],
      executors: [],
      executors_types: [],
      strategies_parsed_metadata: []
    },
    // NOTE: ignored
    execution: [],
    execution_hash: '',
    execution_time: 0,
    execution_strategy: '',
    execution_strategy_type: '',
    timelock_veto_guardian: null,
    strategies: [],
    strategies_indicies: [],
    strategies_params: [],
    tx: '',
    execution_tx: null,
    veto_tx: null,
    has_execution_window_opened: false
  };
}

function formatVote(vote: ApiVote): Vote {
  return {
    id: vote.id,
    voter: {
      id: vote.voter
    },
    space: {
      id: vote.space.id
    },
    proposal: vote.proposal.id,
    // TODO: handle multiple choices
    choice: Array.isArray(vote.choice) ? vote.choice[0] : vote.choice,
    vp: vote.vp,
    created: vote.created,
    tx: vote.ipfs
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

      const [orderBy, orderDirection] = sortBy.split('-');

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

      const addresses = data.votes.map(vote => vote.voter);
      const names = await getNames(addresses);

      return data.votes.map(vote => {
        const formattedVote = formatVote(vote);
        formattedVote.voter.name = names[vote.voter] || undefined;

        return formattedVote;
      });
    },
    loadUserVotes: async (): Promise<{ [key: string]: Vote }> => {
      return {};
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
        filters.end_gte = current;
      } else if (filter === 'pending') {
        filters.start_gt = current;
      } else if (filter === 'closed') {
        filters.end_lt = current;
      }

      const { data } = await apollo.query({
        query: PROPOSALS_QUERY,
        variables: {
          first: limit,
          skip,
          where: {
            space: spaceId,
            title_contains: searchQuery,
            flagged: false,
            ...filters
          }
        }
      });

      return data.proposals.map(proposal => formatProposal(proposal, networkId));
    },
    loadProposal: async (spaceId: string, proposalId: number): Promise<Proposal | null> => {
      const { data } = await apollo.query({
        query: PROPOSAL_QUERY,
        variables: { id: proposalId }
      });

      if (data.proposal.metadata === null) return null;

      return formatProposal(data.proposal, networkId);
    },
    loadSpaces: async (
      { limit, skip = 0 }: PaginationOpts,
      filter?: SpacesFilter
    ): Promise<Space[]> => {
      const { data } = await apollo.query({
        query: SPACES_RANKING_QUERY,
        variables: {
          first: Math.min(limit, 20),
          skip,
          where: {
            ...filter
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
    loadUser: async (id: string): Promise<User | null> => {
      // NOTE: missing proposal/vote count on offchain
      return {
        id,
        proposal_count: 0,
        vote_count: 0,
        created: 0
      };
    }
  };
}
