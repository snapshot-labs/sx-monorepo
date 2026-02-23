import {
  ApolloClient,
  createHttpLink,
  InMemoryCache
} from '@apollo/client/core';
import {
  CHAIN_IDS,
  DELEGATE_REGISTRY_STRATEGIES,
  DELEGATION_TYPES_NAMES
} from '@/helpers/constants';
import { parseOSnapTransaction } from '@/helpers/osnap/transactions';
import { getProposalCurrentQuorum } from '@/helpers/quorum';
import { parseSafeSnapTransaction } from '@/helpers/safesnap/transactions';
import { getNames } from '@/helpers/stamp';
import { clone, compareAddresses } from '@/helpers/utils';
import {
  NetworkApi,
  NetworkConstants,
  PaginationOpts,
  ProposalsFilter,
  SpacesFilter,
  StrategyTemplate
} from '@/networks/types';
import {
  Alias,
  Follow,
  Member,
  NetworkID,
  OffchainAdditionalRawData,
  Proposal,
  ProposalExecution,
  ProposalState,
  RelatedSpace,
  Setting,
  SkinSettings,
  Space,
  SpaceMetadataDelegation,
  SpaceMetadataTreasury,
  Statement,
  User,
  UserActivity,
  Vote
} from '@/types';
import {
  ALIASES_QUERY,
  LEADERBOARD_QUERY,
  NETWORKS_QUERY,
  PROPOSAL_QUERY,
  PROPOSALS_QUERY,
  RANKING_QUERY,
  SETTINGS_QUERY,
  SPACE_QUERY,
  SPACES_QUERY,
  STATEMENTS_QUERY,
  STRATEGIES_QUERY,
  STRATEGY_QUERY,
  USER_FOLLOWS_QUERY,
  USER_QUERY,
  USER_VOTES_QUERY,
  VOTES_QUERY
} from './queries';
import {
  ApiProposal,
  ApiRelatedSpace,
  ApiSpace,
  ApiStrategy,
  ApiVote
} from './types';

const DEFAULT_AUTHENTICATOR = 'OffchainAuthenticator';

const SPLIT_DELEGATION_STRATEGIES = ['split-delegation'];

const SPLIT_DELEGATION_DATA: SpaceMetadataDelegation = {
  name: 'Split Delegation',
  apiType: 'split-delegation',
  apiUrl: 'https://delegate-api.gnosisguild.org',
  contractAddress: '0xDE1e8A7E184Babd9F0E3af18f40634e9Ed6F0905',
  chainId: '1'
};

const DELEGATE_REGISTRY_URLS: Partial<Record<NetworkID, string>> = {
  s: 'https://delegate-registry-api.snapshot.box',
  's-tn': 'https://testnet-delegate-registry-api.snapshot.box'
};

function getProposalState(
  networkId: NetworkID,
  proposal: ApiProposal
): ProposalState {
  if (proposal.state === 'closed') {
    if (proposal.type !== 'basic') {
      return 'closed';
    }

    const currentQuorum = getProposalCurrentQuorum(networkId, {
      scores: proposal.scores,
      scores_total: proposal.scores_total,
      quorum_type: proposal.quorumType
    });

    if (proposal.quorumType === 'rejection') {
      return currentQuorum > proposal.quorum ? 'rejected' : 'passed';
    }

    if (currentQuorum < proposal.quorum) {
      return 'rejected';
    }

    return proposal.scores[0] > proposal.scores[1] ? 'passed' : 'rejected';
  }

  return proposal.state;
}

function getAuthorRole(
  authorAddress: string,
  {
    admins,
    moderators,
    members
  }: {
    admins: string[];
    moderators: string[];
    members: string[];
  }
): Member['role'] | null {
  if (admins.some(address => compareAddresses(address, authorAddress)))
    return 'admin';
  if (moderators.some(address => compareAddresses(address, authorAddress)))
    return 'moderator';
  if (members.some(address => compareAddresses(address, authorAddress)))
    return 'author';

  return null;
}

function formatSpace(
  space: ApiSpace,
  networkId: NetworkID,
  constants: NetworkConstants
): Space {
  const treasuries: SpaceMetadataTreasury[] = space.treasuries.map(treasury => {
    const chainId = treasury.network;

    return {
      name: treasury.name,
      address: treasury.address,
      chainId
    };
  });

  let validationName = space.validation.name;
  const validationParams = clone(space.validation.params) || {};
  if (space.validation.name === 'basic') {
    validationParams.minScore =
      space.validation?.params?.minScore || space.filters.minScore;
    validationParams.strategies =
      space.validation?.params?.strategies || space.strategies;
  }

  if (space.filters.onlyMembers) {
    validationName = 'only-members';
    validationParams.addresses = space.members.concat(space.admins);
  }

  function formatRelatedSpace(space: ApiRelatedSpace): RelatedSpace {
    return {
      id: space.id,
      protocol: 'snapshot',
      name: space.name,
      network: networkId,
      avatar: space.avatar,
      cover: space.cover || '',
      proposal_count: space.proposalsCount,
      vote_count: space.votesCount,
      follower_count: space.followersCount,
      active_proposals: space.activeProposals,
      turbo: space.turbo,
      verified: space.verified,
      snapshot_chain_id: space.network
    };
  }

  function formatSkinSettings(skinSettings: SkinSettings): SkinSettings {
    return {
      bg_color: skinSettings?.bg_color || '',
      link_color: skinSettings?.link_color || '',
      text_color: skinSettings?.text_color || '',
      content_color: skinSettings?.content_color || '',
      border_color: skinSettings?.border_color || '',
      heading_color: skinSettings?.heading_color || '',
      primary_color: skinSettings?.primary_color || '',
      theme: skinSettings?.theme || 'light',
      logo: skinSettings?.logo
    };
  }

  const additionalRawData: OffchainAdditionalRawData = {
    type: 'offchain',
    private: space.private,
    flagged: space.flagged,
    flagCode: space.flagCode,
    hibernated: space.hibernated,
    domain: space.domain,
    skin: space.skin,
    skinSettings: formatSkinSettings(space.skinSettings),
    strategies: space.strategies,
    categories: space.categories,
    admins: space.admins,
    moderators: space.moderators,
    members: space.members,
    plugins: space.plugins,
    delegationPortal: space.delegationPortal,
    filters: space.filters,
    voting: space.voting,
    validation: space.validation,
    voteValidation: space.voteValidation,
    boost: space.boost
  };

  return {
    id: space.id,
    protocol: 'snapshot',
    network: networkId,
    verified: space.verified,
    turbo: space.turbo,
    turbo_expiration: space.turboExpiration,
    controller: '',
    snapshot_chain_id: space.network,
    name: space.name || '',
    avatar: space.avatar || '',
    cover: space.cover || '',
    about: space.about || '',
    external_url: space.website || '',
    github: space.github || '',
    twitter: space.twitter || '',
    discord: '',
    farcaster: space.farcaster || '',
    coingecko: space.coingecko || '',
    proposal_count_1d: space.proposalsCount1d,
    proposal_count_30d: space.proposalsCount30d,
    proposal_count: space.proposalsCount,
    vote_count: space.votesCount,
    follower_count: space.followersCount,
    voting_power_symbol: space.symbol || '',
    active_proposals: space.activeProposals,
    voting_delay: space.voting.delay ?? 0,
    voting_types: space.voting.type
      ? [space.voting.type]
      : constants.EDITOR_VOTING_TYPES,
    min_voting_period: space.voting.period ?? 0,
    max_voting_period: space.voting.period ?? 0,
    proposal_threshold: '1',
    treasuries,
    labels: space.labels,
    delegations: formatDelegations(space, networkId),
    // NOTE: ignored
    created: 0,
    authenticators: [DEFAULT_AUTHENTICATOR],
    executors: [],
    executors_types: [],
    executors_destinations: [],
    executors_strategies: [],
    strategies: space.strategies.map(strategy => strategy.name),
    strategies_indices: [],
    strategies_params: space.strategies.map(strategy => strategy),
    strategies_parsed_metadata: [],
    validation_strategy: '',
    validation_strategy_params: '',
    voting_power_validation_strategy_strategies: [validationName],
    voting_power_validation_strategy_strategies_params: [
      validationParams as any
    ],
    voting_power_validation_strategies_parsed_metadata: [],
    children: space.children.map(formatRelatedSpace),
    parent: space.parent ? formatRelatedSpace(space.parent) : null,
    terms: space.terms,
    privacy: space.voting.privacy || 'none',
    guidelines: space.guidelines,
    template: space.template,
    additionalRawData
  };
}

function formatProposal(proposal: ApiProposal, networkId: NetworkID): Proposal {
  let executions = [] as ProposalExecution[];
  let executionType = '';
  let isInvalid = false;

  const chainIdToNetworkId = Object.fromEntries(
    Object.entries(CHAIN_IDS).map(([k, v]) => [v, k])
  );

  if (proposal.plugins.oSnap) {
    try {
      executions = [
        ...executions,
        ...proposal.plugins.oSnap.safes.map(safe => {
          const chainId = Number(safe.network);

          return {
            strategyType: 'oSnap',
            safeName: safe.safeName,
            safeAddress: safe.safeAddress,
            networkId: chainIdToNetworkId[chainId],
            chainId,
            transactions: safe.transactions.map(transaction =>
              parseOSnapTransaction(transaction)
            )
          };
        })
      ];
      executionType = 'oSnap';
    } catch (e) {
      console.warn('failed to parse oSnap execution', e);
      isInvalid = true;
    }
  } else if (proposal.plugins.safeSnap) {
    try {
      const safeSnapConfig = proposal.plugins.safeSnap;
      const safes: any[] =
        safeSnapConfig.safes ||
        (safeSnapConfig.txs ? [{ txs: safeSnapConfig.txs }] : []);

      executions = [
        ...executions,
        ...safes
          .map(safe => {
            const chainId = Number(safe.network || 1);
            const batches: any[] = safe.txs || [];

            const transactions = batches.flatMap(batch => {
              const txs = batch.transactions || batch;
              return (Array.isArray(txs) ? txs : [txs]).map(tx =>
                parseSafeSnapTransaction(tx)
              );
            });

            return {
              strategyType: 'safeSnap',
              safeName: '',
              safeAddress: safe.realityAddress || safe.umaAddress || '',
              networkId: chainIdToNetworkId[chainId],
              chainId,
              transactions
            };
          })
          .filter(execution => execution.transactions.length > 0)
      ];
      executionType = 'safeSnap';
    } catch (err) {
      console.warn('failed to parse safeSnap execution', err);
      isInvalid = true;
    }
  }

  if (proposal.plugins.readOnlyExecution) {
    executions = [
      ...executions,
      ...proposal.plugins.readOnlyExecution.safes.map(safe => {
        return {
          strategyType: 'ReadOnlyExecution',
          safeName: safe.safeName,
          safeAddress: safe.safeAddress,
          networkId: chainIdToNetworkId[safe.chainId],
          chainId: safe.chainId,
          transactions: safe.transactions
        };
      })
    ];
  }

  const voting_power_validation_params: any = [proposal.validation.params];
  if (
    proposal.validation.name === 'basic' &&
    !(proposal.validation.params.strategies || []).length
  ) {
    voting_power_validation_params[0].strategies = proposal.strategies;
  }

  const state = getProposalState(networkId, proposal);

  const { admins, moderators, members } = proposal.space;

  return {
    id: proposal.id,
    network: networkId,
    metadata_uri: proposal.ipfs,
    isInvalid,
    author: {
      id: proposal.author,
      address_type: 1,
      role: getAuthorRole(proposal.author, {
        admins,
        moderators,
        members
      })
    },
    proposal_id: proposal.id,
    type: proposal.type,
    title: proposal.title,
    body: proposal.body,
    discussion: proposal.discussion,
    executions,
    created: proposal.created,
    edited: proposal.updated,
    start: proposal.start,
    min_end: proposal.end,
    max_end: proposal.end,
    snapshot: proposal.snapshot,
    quorum: proposal.quorum,
    quorum_type: proposal.quorumType,
    choices: proposal.choices,
    labels: proposal.labels,
    scores: proposal.scores,
    scores_total: proposal.scores_total,
    vp_decimals: 0,
    vote_count: proposal.votes,
    state,
    cancelled: false,
    vetoed: false,
    execution_settled: false,
    completed: proposal.state === 'closed' && proposal.scores_state === 'final',
    space: {
      id: proposal.space.id,
      protocol: 'snapshot',
      name: proposal.space.name,
      snapshot_chain_id: proposal.space.network,
      avatar: proposal.space.avatar,
      controller: '',
      admins,
      moderators,
      voting_power_symbol: proposal.space.symbol || '',
      authenticators: [DEFAULT_AUTHENTICATOR],
      executors: [],
      executors_types: [],
      strategies_parsed_metadata: [],
      labels: proposal.space.labels,
      terms: proposal.space.terms
    },
    execution_strategy_type: executionType,
    has_execution_window_opened: state === 'passed',
    // NOTE: ignored
    execution_network: networkId,
    execution_ready: false,
    execution_hash: '',
    execution_time: 0,
    execution_strategy: '',
    execution_destination: '',
    timelock_veto_guardian: null,
    strategies: proposal.strategies.map(strategy => strategy.name),
    strategies_indices: [],
    strategies_params: proposal.strategies.map(strategy => strategy),
    voting_power_validation_strategy_strategies: [proposal.validation.name],
    voting_power_validation_strategy_strategies_params:
      voting_power_validation_params,
    tx: '',
    execution_tx: null,
    executed_at: null,
    veto_tx: null,
    privacy: proposal.privacy || 'none',
    flagged: proposal.flagged,
    flag_code: proposal.flagCode,
    plugins: proposal.plugins
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
    choice: vote.choice,
    vp: vote.vp,
    reason: vote.reason,
    created: vote.created,
    tx: vote.ipfs
  };
}

function formatDelegations(
  space: ApiSpace,
  networkId: NetworkID
): SpaceMetadataDelegation[] {
  const delegations: SpaceMetadataDelegation[] = [];

  const basicDelegationStrategy = space.strategies.find(strategy =>
    DELEGATE_REGISTRY_STRATEGIES.includes(strategy.name)
  );

  if (space.delegationPortal) {
    const apiType =
      space.delegationPortal.delegationType === 'compound-governor'
        ? 'governor-subgraph'
        : space.delegationPortal.delegationType;

    const name = DELEGATION_TYPES_NAMES[apiType];

    const chainId = space.delegationPortal.delegationNetwork;

    delegations.push({
      name,
      apiType,
      apiUrl: space.delegationPortal.delegationApi,
      contractAddress: space.delegationPortal.delegationContract,
      chainId
    });
  }

  if (basicDelegationStrategy) {
    const chainId = space.network;

    const apiUrl = DELEGATE_REGISTRY_URLS[networkId];
    if (apiUrl) {
      delegations.push({
        name: DELEGATION_TYPES_NAMES['delegate-registry'],
        apiType: 'delegate-registry',
        apiUrl,
        contractAddress: space.id,
        chainId
      });
    }
  }

  const splitDelegationStrategy = space.strategies.find(strategy =>
    SPLIT_DELEGATION_STRATEGIES.includes(strategy.name)
  );
  if (
    splitDelegationStrategy &&
    space.delegationPortal?.delegationType !== SPLIT_DELEGATION_DATA.apiType
  ) {
    delegations.push(SPLIT_DELEGATION_DATA);
  }

  return delegations;
}

function formatStrategy(strategy: ApiStrategy): StrategyTemplate {
  const hasDefinition = 'schema' in strategy && strategy.schema;

  return {
    address: strategy.id,
    name: strategy.id,
    author: strategy.author,
    version: `v${strategy.version}`,
    defaultParams: !hasDefinition
      ? strategy.examples?.[0]?.strategy?.params || {
          symbol: 'DAI',
          address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          decimals: 18
        }
      : {},
    spaceCount: strategy.spacesCount,
    verifiedSpaceCount: strategy.verifiedSpacesCount,
    paramsDefinition: hasDefinition
      ? strategy.schema.definitions?.Strategy
      : null,
    disabled: strategy.disabled
  };
}

export function createApi(
  uri: string,
  networkId: NetworkID,
  constants: NetworkConstants
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

  return {
    apiUrl: uri,
    loadProposalScoresTicks: async () => [],
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
        data.votes.map(vote => [
          `${networkId}:${vote.proposal.id}`,
          formatVote(vote)
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
      const _filters: ProposalsFilter = clone(filters || {});
      const state = _filters.state;

      if (state === 'active') {
        _filters.start_lte = current;
        _filters.end_gte = current;
      } else if (state === 'pending') {
        _filters.start_gt = current;
      } else if (state === 'closed') {
        _filters.end_lt = current;
      }

      Object.keys(_filters || {})
        .filter(key => /^(min|max)_end/.test(key))
        .forEach(key => {
          _filters[key.replace(/^(min|max)_/, '')] = _filters[key];
          delete _filters[key];
        });

      delete _filters.state;

      if (_filters.labels?.length) {
        _filters.labels_in = _filters.labels;
      }

      delete _filters.labels;

      const { data } = await apollo.query({
        query: PROPOSALS_QUERY,
        variables: {
          first: limit,
          skip,
          where: {
            space_in: spaceIds,
            title_contains: searchQuery,
            flagged: false,
            ..._filters
          }
        }
      });

      return data.proposals.map(proposal =>
        formatProposal(proposal, networkId)
      );
    },
    loadProposal: async (
      spaceId: string,
      proposalId: number
    ): Promise<Proposal | null> => {
      const { data } = await apollo.query({
        query: PROPOSAL_QUERY,
        variables: { id: proposalId }
      });

      if (
        !data.proposal ||
        data.proposal.metadata === null ||
        data.proposal.space?.id !== spaceId
      ) {
        return null;
      }

      return formatProposal(data.proposal, networkId);
    },
    loadSpaces: async (
      { limit, skip = 0 }: PaginationOpts,
      filter?: SpacesFilter
    ): Promise<Space[]> => {
      delete filter?.protocol;

      if (
        !filter ||
        filter.hasOwnProperty('searchQuery') ||
        filter.hasOwnProperty('category') ||
        filter.hasOwnProperty('network')
      ) {
        const where = {};
        if (filter?.searchQuery) where['search'] = filter.searchQuery;
        if (filter?.category) where['category'] = filter.category;
        if (filter?.network && filter.network !== 'all') {
          where['network'] = filter.network;
        }

        const { data } = await apollo.query({
          query: RANKING_QUERY,
          variables: {
            first: Math.min(limit, 20),
            skip,
            where
          }
        });
        return data.ranking.items.map(space =>
          formatSpace(space, networkId, constants)
        );
      }

      const { data } = await apollo.query({
        query: SPACES_QUERY,
        variables: {
          first: limit,
          skip,
          where: {
            ...filter
          }
        }
      });

      return data.spaces.map(space => formatSpace(space, networkId, constants));
    },
    loadSpace: async (id: string): Promise<Space | null> => {
      const { data } = await apollo.query({
        query: SPACE_QUERY,
        variables: { id }
      });

      if (!data.space) return null;
      if (data.space.metadata === null) return null;

      return formatSpace(data.space, networkId, constants);
    },
    loadUser: async (id: string): Promise<User> => {
      let {
        data: { user }
      } = await apollo.query({
        query: USER_QUERY,
        variables: { id }
      });

      if (!user) {
        user = { id };
      }

      return {
        ...user,
        created: user.created || null,
        name: user.name || (await getNames([user.id]))?.[user.id] || '',
        about: user.about || '',
        avatar: user.avatar || '',
        cover: user.cover || '',
        twitter: user.twitter || '',
        github: user.github || '',
        lens: user.lens || '',
        farcaster: user.farcaster || ''
      };
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
            spaceId: `${networkId}:${leaderboard.space}`,
            vote_count: leaderboard.votesCount,
            proposal_count: leaderboard.proposalsCount
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
            id: leaderboard.user,
            spaceId: leaderboard.space,
            vote_count: leaderboard.votesCount,
            proposal_count: leaderboard.proposalsCount
          }))
        );
    },
    loadFollows: async (
      userId?: string,
      spaceId?: string
    ): Promise<Follow[]> => {
      const {
        data: { follows }
      }: { data: { follows: Follow[] } } = await apollo.query({
        query: USER_FOLLOWS_QUERY,
        variables: {
          first: 25,
          follower: userId,
          space: spaceId
        }
      });

      return follows.map(follow => ({
        ...follow,
        space: { ...follow.space, network: follow.network }
      }));
    },
    loadAlias: async (
      address: string,
      aliasAddress: string,
      created_gt: number
    ): Promise<Alias | null> => {
      const {
        data: { aliases }
      }: { data: { aliases: Alias[] } } = await apollo.query({
        query: ALIASES_QUERY,
        variables: {
          address,
          alias: aliasAddress,
          created_gt
        }
      });

      return aliases?.[0] ?? null;
    },
    loadStatement: async (
      networkId: NetworkID,
      spaceId: string,
      userId: string
    ): Promise<Statement | null> => {
      const {
        data: { statements }
      }: { data: { statements: Statement[] } } = await apollo.query({
        query: STATEMENTS_QUERY,
        variables: {
          where: {
            delegate: userId,
            network: networkId,
            space: spaceId
          }
        }
      });

      return statements?.[0] ?? null;
    },
    loadStatements: async (
      networkId: NetworkID,
      spaceId: string,
      userIds: string[]
    ): Promise<Statement[]> => {
      const {
        data: { statements }
      }: { data: { statements: Statement[] } } = await apollo.query({
        query: STATEMENTS_QUERY,
        variables: {
          where: {
            delegate_in: userIds,
            network: networkId,
            space: spaceId
          }
        }
      });

      return statements;
    },
    loadStrategies: async () => {
      const { data } = await apollo.query({
        query: STRATEGIES_QUERY
      });

      return data.strategies.map((strategy: ApiStrategy) =>
        formatStrategy(strategy)
      );
    },
    loadStrategy: async (id: string) => {
      const { data } = await apollo.query({
        query: STRATEGY_QUERY,
        variables: { id }
      });

      if (!data.strategy) return null;

      return formatStrategy(data.strategy as ApiStrategy);
    },
    getNetworks: async () => {
      const { data } = await apollo.query({
        query: NETWORKS_QUERY
      });

      return Object.fromEntries(
        data.networks.map((network: any) => [
          network.id,
          {
            spaces_count: network.spacesCount,
            premium: network.premium
          }
        ])
      );
    },
    loadSettings: async (): Promise<Setting[]> => {
      const {
        data: { options }
      }: { data: { options: Setting[] } } = await apollo.query({
        query: SETTINGS_QUERY
      });

      return options;
    },
    loadLastIndexedBlock: async () => null
  };
}
