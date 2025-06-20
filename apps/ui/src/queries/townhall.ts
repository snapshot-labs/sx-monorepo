import {
  QueryClient,
  skipToken,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { SpaceType } from '@/composables/useTownhallSpace';
import {
  getResultsByRole,
  getRoles,
  getSpace,
  getTopic,
  getTopics,
  getUserRoles,
  getVotes,
  newPostEventToEntry,
  newVoteEventToEntry,
  Result
} from '@/helpers/townhall/api';
import { Role, Topic, Vote } from '@/helpers/townhall/types';

export const TOPICS_LIMIT = 20;
export const TOPICS_SUMMARY_LIMIT = 6;

const DEFAULT_STALE_TIME = 1000 * 5;

function addVoteToRoleResults({
  queryClient,
  spaceId,
  topicId,
  roleId,
  vote
}: {
  queryClient: QueryClient;
  spaceId: number;
  topicId: number;
  roleId: string;
  vote: Vote;
}) {
  queryClient.setQueryData<Result[]>(
    ['townhall', 'topicResults', { spaceId, topicId, roleId }, 'list'],
    oldData => {
      const updatedData = structuredClone(oldData ?? []);
      const existingResult = updatedData.find(
        r => r.post_id === vote.post_id && r.choice === vote.choice
      );
      if (existingResult) {
        existingResult.vote_count += 1;
      } else {
        updatedData.push({
          post_id: vote.post_id,
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
  spaceId: MaybeRefOrGetter<number | null>;
  spaceType: MaybeRefOrGetter<SpaceType>;
}) {
  const queryFn = computed(() => {
    const spaceTypeValue = toValue(spaceType);
    const spaceIdValue = toValue(spaceId);

    if (spaceTypeValue !== 'discussionsSpace' || !spaceIdValue) {
      return skipToken;
    }

    return () => {
      return getSpace(spaceIdValue);
    };
  });

  return useQuery({
    queryKey: ['townhall', 'spaces', 'detail', { spaceId }],
    queryFn,
    retry: (failureCount, error) => {
      if (error?.message.includes('Row not found')) return false;

      return failureCount < 3;
    },
    staleTime: DEFAULT_STALE_TIME
  });
}

export function useTopicsQuery({
  spaceId
}: {
  spaceId: MaybeRefOrGetter<number>;
}) {
  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: ['townhall', 'topics', 'list', { spaceId }],
    queryFn: async ({ pageParam = 0 }) => {
      return getTopics({
        spaceId: toValue(spaceId),
        limit: TOPICS_LIMIT,
        skip: pageParam
      });
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
  spaceId: MaybeRefOrGetter<number>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  return useQuery({
    queryKey: ['townhall', 'topics', 'summary', { spaceId }],
    queryFn: async () => {
      return getTopics({
        spaceId: toValue(spaceId),
        skip: 0,
        limit: TOPICS_SUMMARY_LIMIT
      });
    },
    staleTime: DEFAULT_STALE_TIME,
    enabled: () => toValue(enabled)
  });
}

export function useTopicQuery({
  spaceId,
  topicId
}: {
  spaceId: MaybeRefOrGetter<number>;
  topicId: MaybeRefOrGetter<number>;
}) {
  return useQuery({
    queryKey: ['townhall', 'topics', 'detail', { spaceId, topicId }],
    queryFn: async () => {
      const topic = await getTopic(toValue(spaceId), toValue(topicId));
      if (!topic) return null;

      topic.posts = topic.posts
        .filter(s => !s.hidden)
        .sort((a, b) => Number(b.pinned) - Number(a.pinned));

      return topic;
    },
    staleTime: DEFAULT_STALE_TIME
  });
}

export function useUserVotesQuery({
  spaceId,
  topicId,
  user
}: {
  spaceId: MaybeRefOrGetter<number>;
  topicId: MaybeRefOrGetter<number>;
  user: MaybeRefOrGetter<string>;
}) {
  return useQuery({
    queryKey: ['townhall', 'votes', 'list', { spaceId, topicId, user }],
    queryFn: async () => {
      return getVotes(toValue(spaceId), toValue(topicId), toValue(user));
    },
    enabled: () => !!toValue(user),
    staleTime: DEFAULT_STALE_TIME
  });
}

export function useRolesQuery(spaceId: MaybeRefOrGetter<number>) {
  return useQuery({
    queryKey: ['townhall', 'roles', spaceId, 'list'],
    queryFn: () => {
      return getRoles(toValue(spaceId));
    }
  });
}

export function useUserRolesQuery({
  spaceId,
  user
}: {
  spaceId: MaybeRefOrGetter<number>;
  user: MaybeRefOrGetter<string>;
}) {
  return useQuery({
    queryKey: ['townhall', 'userRoles', { spaceId, user }, 'list'],
    queryFn: () => {
      return getUserRoles(toValue(spaceId), toValue(user));
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
  spaceId,
  topicId,
  roleId
}: {
  spaceId: MaybeRefOrGetter<number>;
  topicId: MaybeRefOrGetter<number>;
  roleId: MaybeRefOrGetter<string>;
}) {
  return useQuery({
    queryKey: [
      'townhall',
      'topicResults',
      { spaceId, topicId, roleId },
      'list'
    ],
    queryFn: () => {
      return getResultsByRole(
        toValue(spaceId),
        toValue(topicId),
        toValue(roleId)
      );
    },
    staleTime: DEFAULT_STALE_TIME
  });
}

export function useRoleMutation({
  spaceId
}: {
  spaceId: MaybeRefOrGetter<number>;
}) {
  const { web3 } = useWeb3();
  const queryClient = useQueryClient();
  const { addNotification } = useUiStore();
  const { sendClaimRole, sendRevokeRole } = useTownhall();

  return useMutation({
    mutationFn: ({ role, isRevoking }: { role: Role; isRevoking: boolean }) => {
      return isRevoking
        ? sendRevokeRole(role.space.space_id, role.id)
        : sendClaimRole(role.space.space_id, role.id);
    },
    onSuccess: (data, { role, isRevoking }) => {
      if (!data) return;

      queryClient.setQueryData<Role[]>(
        [
          'townhall',
          'userRoles',
          { user: web3.value.account, spaceId: toValue(spaceId) },
          'list'
        ],
        (old = []) =>
          isRevoking ? old.filter(r => r.id !== role.id) : [...old, role]
      );
    },
    onError: error => {
      addNotification('error', error.message);
    }
  });
}

export function useCloseTopicMutation({
  spaceId,
  topicId
}: {
  spaceId: MaybeRefOrGetter<number>;
  topicId: MaybeRefOrGetter<number>;
}) {
  const queryClient = useQueryClient();
  const { addNotification } = useUiStore();
  const { sendCloseTopic } = useTownhall();

  return useMutation({
    mutationFn: () => {
      return sendCloseTopic(toValue(spaceId), toValue(topicId));
    },
    onSuccess: () => {
      queryClient.setQueryData<Topic>(
        ['townhall', 'topics', 'detail', { spaceId, topicId }],
        old => {
          if (!old) return old;

          return {
            ...old,
            closed: true
          };
        }
      );

      addNotification('success', 'Topic closed successfully');
    },
    onError: error => {
      addNotification('error', error.message);
    }
  });
}

export function useCreatePostMutation({
  spaceId,
  topicId
}: {
  spaceId: MaybeRefOrGetter<number>;
  topicId: MaybeRefOrGetter<number>;
}) {
  const queryClient = useQueryClient();
  const { addNotification } = useUiStore();
  const { sendPost } = useTownhall();

  return useMutation({
    mutationFn: (body: string) => {
      return sendPost(toValue(spaceId), toValue(topicId), body);
    },
    onSuccess: async (data, body) => {
      if (!data) return;

      const { data: eventData } = data.result.events.find(
        event => event.key === 'new_post'
      );

      const post = { ...newPostEventToEntry(eventData), body };

      queryClient.setQueryData<Topic>(
        ['townhall', 'topics', 'detail', { spaceId, topicId }],
        old => {
          if (!old) return old;

          return {
            ...old,
            posts: [...old.posts, post]
          };
        }
      );

      addNotification('success', 'Post published successfully');
    },
    onError: error => {
      addNotification('error', error.message);
    }
  });
}

export function useSetPostVisibilityMutation({
  spaceId,
  topicId
}: {
  spaceId: MaybeRefOrGetter<number>;
  topicId: MaybeRefOrGetter<number>;
}) {
  const queryClient = useQueryClient();
  const { addNotification } = useUiStore();
  const { sendPinPost, sendUnpinPost, sendHidePost } = useTownhall();

  return useMutation({
    mutationFn: ({
      postId,
      visibility
    }: {
      postId: number;
      visibility: 'pin' | 'unpin' | 'hide';
    }) => {
      if (visibility === 'pin') {
        return sendPinPost(toValue(spaceId), toValue(topicId), postId);
      }

      if (visibility === 'unpin') {
        return sendUnpinPost(toValue(spaceId), toValue(topicId), postId);
      }

      if (visibility === 'hide') {
        return sendHidePost(toValue(spaceId), toValue(topicId), postId);
      }

      throw new Error('Invalid visibility type');
    },
    onSuccess: async (_, { postId, visibility }) => {
      queryClient.setQueryData<Topic>(
        ['townhall', 'topics', 'detail', { spaceId, topicId }],
        old => {
          if (!old) return old;

          return {
            ...old,
            posts: old.posts.map(post => {
              if (post.post_id !== postId) return post;

              if (visibility === 'pin') {
                return {
                  ...post,
                  pinned: true
                };
              }

              if (visibility === 'unpin') {
                return {
                  ...post,
                  pinned: false
                };
              }

              if (visibility === 'hide') {
                return {
                  ...post,
                  hidden: true
                };
              }

              return post;
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
  topicId,
  userRoles
}: {
  spaceId: MaybeRefOrGetter<number>;
  topicId: MaybeRefOrGetter<number>;
  userRoles: MaybeRefOrGetter<Role[] | undefined>;
}) {
  const { web3 } = useWeb3();
  const queryClient = useQueryClient();
  const { addNotification } = useUiStore();
  const { sendVote } = useTownhall();

  return useMutation({
    mutationFn: ({ postId, choice }: { postId: number; choice: 1 | 2 | 3 }) => {
      return sendVote(toValue(spaceId), toValue(topicId), postId, choice);
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
          { spaceId, topicId, user: web3.value.account }
        ],
        (old = []) => [...old, vote]
      );

      const roles = ['any', ...(toValue(userRoles) ?? []).map(role => role.id)];
      roles.forEach(role => {
        addVoteToRoleResults({
          queryClient,
          spaceId: toValue(spaceId),
          topicId: toValue(topicId),
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
