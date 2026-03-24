import {
  skipToken,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { SpaceType } from '@/composables/useTownhallSpace';
import {
  getCategories,
  getCategory,
  getResultsByRole,
  getRoles,
  getSpace,
  getTopic,
  getTopics,
  getUserRoles,
  getVotes
} from '@/helpers/townhall/api';
import { Category, Role, Topic } from '@/helpers/townhall/types';

export const TOPICS_LIMIT = 20;
export const TOPICS_SUMMARY_LIMIT = 6;

const DEFAULT_STALE_TIME = 1000 * 5;

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

export function useCategoryQuery({
  spaceId,
  categoryId
}: {
  spaceId: MaybeRefOrGetter<number>;
  categoryId: MaybeRefOrGetter<number | null>;
}) {
  const queryFn = computed(() => {
    const spaceIdValue = toValue(spaceId);
    const categoryIdValue = toValue(categoryId);

    if (!spaceIdValue || !categoryIdValue) {
      return skipToken;
    }

    return () => {
      return getCategory({
        spaceId: spaceIdValue,
        categoryId: categoryIdValue
      });
    };
  });

  return useQuery({
    queryKey: ['townhall', 'categories', 'detail', { spaceId, categoryId }],
    queryFn,
    staleTime: DEFAULT_STALE_TIME
  });
}

export function useCategoriesQuery({
  spaceId,
  categoryId
}: {
  spaceId: MaybeRefOrGetter<number>;
  categoryId: MaybeRefOrGetter<number | null>;
}) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['townhall', 'categories', 'list', { spaceId, categoryId }],
    queryFn: async () => {
      const categories = await getCategories({
        spaceId: toValue(spaceId),
        parentCategoryId: toValue(categoryId)
      });

      for (const category of categories) {
        queryClient.setQueryData(
          [
            'townhall',
            'categories',
            'detail',
            { spaceId, categoryId: category.category_id }
          ],
          category
        );
      }

      return categories;
    },
    staleTime: DEFAULT_STALE_TIME
  });
}

export function useTopicsQuery({
  spaceId,
  categoryId
}: {
  spaceId: MaybeRefOrGetter<number>;
  categoryId: MaybeRefOrGetter<number | null>;
}) {
  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: ['townhall', 'topics', 'list', { spaceId, categoryId }],
    queryFn: async ({ pageParam = 0 }) => {
      return getTopics({
        spaceId: toValue(spaceId),
        categoryId: toValue(categoryId),
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
    queryFn: async () => {
      try {
        return await getUserRoles(toValue(spaceId), toValue(user));
      } catch (err) {
        if (err instanceof Error && err.message.includes('Row not found')) {
          return [];
        }

        throw err;
      }
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

export function useRoleMutation() {
  const queryClient = useQueryClient();
  const { addNotification } = useUiStore();
  const { sendClaimRole, sendRevokeRole } = useTownhall();

  return useMutation({
    mutationFn: ({ role, isRevoking }: { role: Role; isRevoking: boolean }) => {
      return isRevoking
        ? sendRevokeRole(role.space.space_id, role.id)
        : sendClaimRole(role.space.space_id, role.id);
    },
    onSuccess: (data, { isRevoking }) => {
      if (!data) return;

      queryClient.invalidateQueries({
        queryKey: ['townhall', 'userRoles']
      });

      addNotification(
        'success',
        isRevoking ? 'Role revoked' : 'Role claimed'
      );
    },
    onError: error => {
      addNotification('error', error.message);
    }
  });
}

export function useCreateSpaceMutation() {
  const queryClient = useQueryClient();
  const { addNotification } = useUiStore();
  const { sendCreateSpace } = useTownhall();

  return useMutation({
    mutationFn: () => {
      return sendCreateSpace();
    },
    onSuccess: data => {
      if (!data) return;

      queryClient.invalidateQueries({ queryKey: ['townhall', 'spaces'] });
      addNotification('success', 'Space created successfully');
    },
    onError: error => {
      addNotification('error', error.message);
    }
  });
}

export function useCreateCategoryMutation({
  spaceId,
  categoryId
}: {
  spaceId: MaybeRefOrGetter<number>;
  categoryId: MaybeRefOrGetter<number | null>;
}) {
  const queryClient = useQueryClient();
  const { addNotification } = useUiStore();
  const { sendCreateCategory } = useTownhall();

  return useMutation({
    mutationFn: ({
      name,
      description
    }: {
      name: string;
      description: string;
    }) => {
      return sendCreateCategory(
        toValue(spaceId),
        name,
        description,
        toValue(categoryId)
      );
    },
    onSuccess: data => {
      if (!data) return;

      queryClient.invalidateQueries({
        queryKey: ['townhall', 'categories']
      });
      addNotification('success', 'Category created successfully');
    },
    onError: error => {
      addNotification('error', error.message);
    }
  });
}

export function useEditCategoryMutation({
  spaceId,
  categoryId
}: {
  spaceId: MaybeRefOrGetter<number>;
  categoryId: MaybeRefOrGetter<number | null>;
}) {
  const queryClient = useQueryClient();
  const { addNotification } = useUiStore();
  const { sendEditCategory } = useTownhall();

  return useMutation({
    mutationFn: ({
      id,
      name,
      description
    }: {
      id: number;
      name: string;
      description: string;
    }) => {
      return sendEditCategory(
        toValue(spaceId),
        id,
        name,
        description,
        toValue(categoryId)
      );
    },
    onSuccess: data => {
      if (!data) return;

      queryClient.invalidateQueries({
        queryKey: ['townhall', 'categories']
      });
      addNotification('success', 'Category edited successfully');
    },
    onError: error => {
      addNotification('error', error.message);
    }
  });
}

export function useDeleteCategoryMutation({
  spaceId,
  categoryId
}: {
  spaceId: MaybeRefOrGetter<number>;
  categoryId: MaybeRefOrGetter<number | null>;
}) {
  const queryClient = useQueryClient();
  const { addNotification } = useUiStore();
  const { sendDeleteCategory } = useTownhall();

  return useMutation({
    mutationFn: ({ id }: { id: number }) => {
      return sendDeleteCategory(toValue(spaceId), id);
    },
    onSuccess: (data, { id }) => {
      if (!data) return;

      queryClient.setQueryData<Category[]>(
        ['townhall', 'categories', 'list', { spaceId, categoryId }],
        old => {
          if (!old) return old;

          return old.filter(category => category.category_id !== id);
        }
      );

      addNotification('success', 'Category deleted successfully');
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
    onSuccess: data => {
      if (!data) return;

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
    onSuccess: async data => {
      if (!data) return;

      queryClient.invalidateQueries({
        queryKey: ['townhall', 'topics', 'detail', { spaceId, topicId }]
      });
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
    onSuccess: async (data, { postId, visibility }) => {
      if (!data) return;

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
  topicId
}: {
  spaceId: MaybeRefOrGetter<number>;
  topicId: MaybeRefOrGetter<number>;
}) {
  const queryClient = useQueryClient();
  const { addNotification } = useUiStore();
  const { sendVote } = useTownhall();

  return useMutation({
    mutationFn: ({ postId, choice }: { postId: number; choice: 1 | 2 | 3 }) => {
      return sendVote(toValue(spaceId), toValue(topicId), postId, choice);
    },
    onSuccess: async data => {
      if (!data) return;

      queryClient.invalidateQueries({
        queryKey: ['townhall', 'votes']
      });
      queryClient.invalidateQueries({
        queryKey: ['townhall', 'topicResults']
      });
      addNotification('success', 'Vote submitted successfully');
    },
    onError: error => {
      addNotification('error', error.message);
    }
  });
}
