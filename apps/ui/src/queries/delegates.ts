import { useInfiniteQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { RequiredProperty, Space, SpaceMetadataDelegation } from '@/types';

const ITEMS_PER_PAGE = 40;
const RETRY_COUNT = 3;

export function useDelegatesQuery(
  delegation: MaybeRefOrGetter<SpaceMetadataDelegation>,
  space: MaybeRefOrGetter<Space>,
  sortBy: MaybeRefOrGetter<
    | 'delegatedVotes-desc'
    | 'delegatedVotes-asc'
    | 'tokenHoldersRepresentedAmount-desc'
    | 'tokenHoldersRepresentedAmount-asc'
  >
) {
  const { getDelegates } = useDelegates(
    toValue(delegation) as RequiredProperty<SpaceMetadataDelegation>,
    toValue(space)
  );

  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: ['delegates', () => toValue(delegation).contractAddress, sortBy],
    queryFn: ({ pageParam }) => {
      const [orderBy, orderDirection] = toValue(sortBy).split('-');

      return getDelegates({
        orderBy,
        orderDirection,
        first: ITEMS_PER_PAGE,
        skip: pageParam
      });
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < ITEMS_PER_PAGE) return null;

      return pages.length * ITEMS_PER_PAGE;
    },
    retry: (failureCount, error) => {
      if (error?.message.includes('Row not found')) return false;

      return failureCount < RETRY_COUNT;
    }
  });
}
