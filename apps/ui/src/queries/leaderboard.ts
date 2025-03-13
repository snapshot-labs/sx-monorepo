import { useInfiniteQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { getNames } from '@/helpers/stamp';
import { getNetwork } from '@/networks';
import { NetworkID, UserActivity } from '@/types';

export const LEADERBOARD_LIMIT = 20;

export const LEADERBOARD_KEYS = {
  all: ['leaderboard'] as const,
  space: (
    networkId: MaybeRefOrGetter<NetworkID>,
    spaceId: MaybeRefOrGetter<string>
  ) => [...LEADERBOARD_KEYS.all, networkId, spaceId] as const,
  spaceList: (
    networkId: MaybeRefOrGetter<NetworkID>,
    spaceId: MaybeRefOrGetter<string>,
    sortBy: MaybeRefOrGetter<string>
  ) => [...LEADERBOARD_KEYS.space(networkId, spaceId), 'list', sortBy] as const
};

async function withAuthorNames(users: UserActivity[]): Promise<UserActivity[]> {
  if (!users.length) return [];

  const names = await getNames(users.map(user => user.id));

  return users.map(user => {
    user.name = names[user.id];
    return user;
  });
}

async function getLeaderboard(
  spaceId: string,
  networkId: NetworkID,
  { limit, skip }: { limit: number; skip: number },
  sortBy: string
) {
  const network = getNetwork(networkId);

  return withAuthorNames(
    await network.api.loadLeaderboard(
      spaceId,
      {
        limit,
        skip
      },
      sortBy
    )
  );
}

export function useLeaderboardQuery(
  networkId: MaybeRefOrGetter<NetworkID>,
  spaceId: MaybeRefOrGetter<string>,
  sortBy: MaybeRefOrGetter<string>
) {
  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: LEADERBOARD_KEYS.spaceList(networkId, spaceId, sortBy),
    queryFn: async ({ pageParam = 0 }) => {
      return getLeaderboard(
        toValue(spaceId),
        toValue(networkId),
        {
          limit: LEADERBOARD_LIMIT,
          skip: pageParam
        },
        toValue(sortBy)
      );
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < LEADERBOARD_LIMIT) return null;

      return pages.length * LEADERBOARD_LIMIT;
    }
  });
}
