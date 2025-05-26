import {
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { SpaceType } from '@/composables/useSpaceType';
import {
  getDiscussion,
  getDiscussions,
  getResultsByRole,
  getRoles,
  getCategories,
  getSpace,
  getUserRoles,
  getVotes,
  newStatementEventToEntry,
  newVoteEventToEntry,
  Result
} from '@/helpers/townhall/api';
import { Discussion, Role, Vote } from '@/helpers/townhall/types';

export const TOPICS_LIMIT = 20;
export const TOPICS_SUMMARY_LIMIT = 6;

const DEFAULT_STALE_TIME = 1000 * 5;

function addVoteToRoleResults({
  queryClient,
  discussionId,
  roleId,
  vote
}: {
  queryClient: QueryClient;
  discussionId: number;
  roleId: string;
  vote: Vote;
}) {
  queryClient.setQueryData<Result[]>(
    ['townhall', 'discussionResults', { discussionId, roleId }, 'list'],
    oldData => {
      const updatedData = structuredClone(oldData ?? []);
      const existingResult = updatedData.find(
        r => r.statement_id === vote.statement_id && r.choice === vote.choice
      );
      if (existingResult) {
        existingResult.vote_count += 1;
      } else {
        updatedData.push({
          statement_id: vote.statement_id,
          choice: vote.choice,
          vote_count: 1
        });
      }
      return updatedData;
    }
  );
}

export function useSpaceQuery({
  spaceId,
  spaceType
}: {
  spaceId: MaybeRefOrGetter<string>;
  spaceType: MaybeRefOrGetter<SpaceType>;
}) {
  return useQuery({
    queryKey: ['townhall', 'spaces', 'detail', { spaceId }],
    queryFn: async () => {
      return getSpace(toValue(spaceId));
    },
    retry: (failureCount, error) => {
      if (error?.message.includes('Row not found')) return false;

      return failureCount < 3;
    },
    enabled: () => toValue(spaceType) === 'discussionsSpace',
    staleTime: DEFAULT_STALE_TIME
  });
}

export function useTopicsQuery({
  spaceId
}: {
  spaceId: MaybeRefOrGetter<string>;
}) {
  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: ['townhall', 'discussions', 'list', { spaceId }],
    queryFn: async ({ pageParam = 0 }) => {
      return getDiscussions({ limit: TOPICS_LIMIT, skip: pageParam });
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < TOPICS_LIMIT) return null;

      return pages.length * TOPICS_LIMIT;
    },
    staleTime: DEFAULT_STALE_TIME
  });
}

export function useTopicsSummaryQuery({
  spaceId,
  enabled = true
}: {
  spaceId: MaybeRefOrGetter<string>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  return useQuery({
    queryKey: ['townhall', 'discussions', 'summary', { spaceId }],
    queryFn: async () => {
      return getDiscussions({
        skip: 0,
        limit: TOPICS_SUMMARY_LIMIT
      });
    },
    staleTime: DEFAULT_STALE_TIME,
    enabled: () => toValue(enabled)
  });
}

export function useDiscussionQuery({
  spaceId,
  discussionId
}: {
  spaceId: MaybeRefOrGetter<string>;
  discussionId: MaybeRefOrGetter<number>;
}) {
  return useQuery({
    queryKey: ['townhall', 'discussions', 'detail', { spaceId, discussionId }],
    queryFn: async () => {
      const discussion = await getDiscussion(toValue(discussionId).toString());
      if (!discussion) return null;

      discussion.statements = discussion.statements
        .filter(s => !s.hidden)
        .sort(() => 0.5 - Math.random())
        .sort((a, b) => Number(b.pinned) - Number(a.pinned));

      return discussion;
    },
    staleTime: DEFAULT_STALE_TIME
  });
}

export function useUserVotesQuery({
  spaceId,
  discussionId,
  user
}: {
  spaceId: MaybeRefOrGetter<string>;
  discussionId: MaybeRefOrGetter<number>;
  user: MaybeRefOrGetter<string>;
}) {
  return useQuery({
    queryKey: ['townhall', 'votes', 'list', { spaceId, discussionId, user }],
    queryFn: async () => {
      return getVotes(toValue(discussionId).toString(), toValue(user));
    },
    enabled: () => !!toValue(user),
    staleTime: DEFAULT_STALE_TIME
  });
}

export function useRolesQuery(spaceId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: ['townhall', 'roles', spaceId, 'list'],
    queryFn: () => {
      return getRoles(toValue(spaceId));
    }
  });
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: ['townhall', 'categories', 'list'],
    queryFn: () => {
      return getCategories();
    }
  });
}

export function useUserRolesQuery(user: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: ['townhall', 'userRoles', user, 'list'],
    queryFn: () => {
      return getUserRoles(toValue(user));
    },
    retry: (failureCount, error) => {
      if (error?.message.includes('Row not found')) return false;

      return failureCount < 3;
    },
    enabled: () => !!toValue(user),
    staleTime: DEFAULT_STALE_TIME
  });
}

export function useResultsByRoleQuery({
  discussionId,
  roleId
}: {
  discussionId: MaybeRefOrGetter<number>;
  roleId: MaybeRefOrGetter<string>;
}) {
  return useQuery({
    queryKey: [
      'townhall',
      'discussionResults',
      { discussionId, roleId },
      'list'
    ],
    queryFn: () => {
      return getResultsByRole(toValue(discussionId), toValue(roleId));
    },
    staleTime: DEFAULT_STALE_TIME
  });
}

export function useRoleMutation() {
  const { web3 } = useWeb3();
  const queryClient = useQueryClient();
  const { addNotification } = useUiStore();
  const { sendClaimRole, sendRevokeRole } = useTownhall();

  return useMutation({
    mutationFn: ({ role, isRevoking }: { role: Role; isRevoking: boolean }) => {
      return isRevoking
        ? sendRevokeRole(role.space.id, role.id)
        : sendClaimRole(role.space.id, role.id);
    },
    onSuccess: (data, { role, isRevoking }) => {
      if (!data) return;

      queryClient.setQueryData<Role[]>(
        ['townhall', 'userRoles', web3.value.account, 'list'],
        (old = []) =>
          isRevoking ? old.filter(r => r.id !== role.id) : [...old, role]
      );
    },
    onError: error => {
      addNotification('error', error.message);
    }
  });
}

export function useCloseDiscussionMutation({
  spaceId,
  discussionId
}: {
  spaceId: MaybeRefOrGetter<string>;
  discussionId: MaybeRefOrGetter<number>;
}) {
  const queryClient = useQueryClient();
  const { addNotification } = useUiStore();
  const { sendCloseDiscussion } = useTownhall();

  return useMutation({
    mutationFn: () => {
      return sendCloseDiscussion(toValue(discussionId));
    },
    onSuccess: () => {
      queryClient.setQueryData<Discussion>(
        ['townhall', 'discussions', 'detail', { spaceId, discussionId }],
        old => {
          if (!old) return old;

          return {
            ...old,
            closed: true
          };
        }
      );

      addNotification('success', 'Discussion closed successfully');
    },
    onError: error => {
      addNotification('error', error.message);
    }
  });
}

export function useCreateStatementMutation({
  spaceId,
  discussionId
}: {
  spaceId: MaybeRefOrGetter<string>;
  discussionId: MaybeRefOrGetter<number>;
}) {
  const queryClient = useQueryClient();
  const { addNotification } = useUiStore();
  const { sendStatement } = useTownhall();

  return useMutation({
    mutationFn: (statement: string) => {
      return sendStatement(toValue(discussionId), statement);
    },
    onSuccess: async data => {
      if (!data) return;

      const { data: eventData } = data.result.events.find(
        event => event.key === 'new_statement'
      );

      const statement = newStatementEventToEntry(eventData);

      queryClient.setQueryData<Discussion>(
        ['townhall', 'discussions', 'detail', { spaceId, discussionId }],
        old => {
          if (!old) return old;

          return {
            ...old,
            statements: [...old.statements, statement]
          };
        }
      );

      addNotification('success', 'Statement published successfully');
    },
    onError: error => {
      addNotification('error', error.message);
    }
  });
}

export function useSetStatementVisibilityMutation({
  spaceId,
  discussionId
}: {
  spaceId: MaybeRefOrGetter<string>;
  discussionId: MaybeRefOrGetter<number>;
}) {
  const queryClient = useQueryClient();
  const { addNotification } = useUiStore();
  const { sendPinStatement, sendHideStatement } = useTownhall();

  return useMutation({
    mutationFn: ({
      statementId,
      visibility
    }: {
      statementId: number;
      visibility: 'pin' | 'hide';
    }) => {
      if (visibility === 'pin') {
        return sendPinStatement(toValue(discussionId), statementId);
      }

      if (visibility === 'hide') {
        return sendHideStatement(toValue(discussionId), statementId);
      }

      throw new Error('Invalid visibility type');
    },
    onSuccess: async (_, { statementId, visibility }) => {
      queryClient.setQueryData<Discussion>(
        ['townhall', 'discussions', 'detail', { spaceId, discussionId }],
        old => {
          if (!old) return old;

          return {
            ...old,
            statements: old.statements.map(statement => {
              if (statement.statement_id !== statementId) return statement;

              if (visibility === 'pin') {
                return {
                  ...statement,
                  pinned: true
                };
              }

              if (visibility === 'hide') {
                return {
                  ...statement,
                  hidden: true
                };
              }

              return statement;
            })
          };
        }
      );
    },
    onError: error => {
      addNotification('error', error.message);
    }
  });
}

export function useVoteMutation({
  spaceId,
  discussionId,
  userRoles
}: {
  spaceId: MaybeRefOrGetter<string>;
  discussionId: MaybeRefOrGetter<number>;
  userRoles: MaybeRefOrGetter<Role[] | undefined>;
}) {
  const { web3 } = useWeb3();
  const queryClient = useQueryClient();
  const { addNotification } = useUiStore();
  const { sendVote } = useTownhall();

  return useMutation({
    mutationFn: ({
      statementId,
      choice
    }: {
      statementId: number;
      choice: 1 | 2 | 3;
    }) => {
      return sendVote(toValue(discussionId), statementId, choice);
    },
    onSuccess: async data => {
      if (!data) return;

      const { data: event } = data.result.events.find(
        event => event.key === 'new_vote'
      );

      const vote = newVoteEventToEntry(event);

      queryClient.setQueryData<Vote[]>(
        [
          'townhall',
          'votes',
          'list',
          { spaceId, discussionId, user: web3.value.account }
        ],
        (old = []) => [...old, vote]
      );

      const roles = ['any', ...(toValue(userRoles) ?? []).map(role => role.id)];
      roles.forEach(role => {
        addVoteToRoleResults({
          queryClient,
          discussionId: toValue(discussionId),
          roleId: role,
          vote
        });
      });
    },
    onError: error => {
      addNotification('error', error.message);
    }
  });
}
