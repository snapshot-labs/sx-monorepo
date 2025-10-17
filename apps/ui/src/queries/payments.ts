import { useInfiniteQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter, toValue } from 'vue';
import { fetchPayments, PAYMENTS_LIMIT } from '@/composables/usePayments';

const RETRY_COUNT = 3;

export function usePaymentsQuery(
  spaceId: MaybeRefOrGetter<string>,
  network: MaybeRefOrGetter<string>
) {
  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: ['payments', { spaceId, network }],
    queryFn: ({ pageParam }) =>
      fetchPayments(toValue(spaceId), toValue(network), pageParam),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < PAYMENTS_LIMIT) return null;

      return pages.length * PAYMENTS_LIMIT;
    },
    retry: (failureCount, error) => {
      if (error?.message.includes('Row not found')) return false;

      return failureCount < RETRY_COUNT;
    }
  });
}
