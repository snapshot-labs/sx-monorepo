import { useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter, toValue } from 'vue';
import { getFeedsTypeList, getSubscription } from '@/helpers/emailNotification';

export function useEmailNotificationQuery(address: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: ['emailNotification', address],
    queryFn: async () => {
      return getSubscription(toValue(address));
    },
    enabled: () => !!toValue(address)
  });
}

export function useEmailNotificationFeedsListQuery() {
  return useQuery({
    queryKey: ['emailNotificationFeedsList'],
    queryFn: async () => {
      return getFeedsTypeList();
    },
    staleTime: Infinity
  });
}
