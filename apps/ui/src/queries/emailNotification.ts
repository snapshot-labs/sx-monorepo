import { useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter, toValue } from 'vue';
import { getFeedsTypeList, getSubscription } from '@/helpers/emailNotification';

export const EMAIL_NOTIFICATION_KEYS = {
  user: (address: MaybeRefOrGetter<string>) => ['emailNotification', address],
  typesList: ['emailNotificationFeedsList']
};

export function useEmailNotificationQuery(address: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: EMAIL_NOTIFICATION_KEYS.user(address),
    queryFn: async () => {
      return getSubscription(toValue(address));
    },
    enabled: () => !!toValue(address)
  });
}

export function useEmailNotificationFeedsListQuery() {
  return useQuery({
    queryKey: EMAIL_NOTIFICATION_KEYS.typesList,
    queryFn: async () => {
      return getFeedsTypeList();
    },
    staleTime: Infinity
  });
}
