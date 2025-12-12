import { useInfiniteQuery, useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import {
  AUCTION_TAG,
  getReferees,
  getUserReferral
} from '@/helpers/auction/referral';
import { getNames } from '@/helpers/stamp';

const LIMIT = 20;

export const REFERRAL_KEYS = {
  all: ['referral'] as const,
  userReferral: (tag: string, account: MaybeRefOrGetter<string | null>) => [
    ...REFERRAL_KEYS.all,
    'user',
    tag,
    account
  ],
  referees: (tag: string) => [...REFERRAL_KEYS.all, 'referees', tag]
};

export function useUserReferralQuery(account: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: REFERRAL_KEYS.userReferral(AUCTION_TAG, account),
    queryFn: async () => {
      const accountValue = toValue(account);
      if (!accountValue) return null;

      const referral = await getUserReferral(AUCTION_TAG, accountValue);
      if (!referral) return null;

      const names = await getNames([referral.referee]);

      return {
        ...referral,
        refereeName: names[referral.referee] || null
      };
    },
    enabled: computed(() => !!toValue(account))
  });
}

export function useRefereesQuery() {
  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: REFERRAL_KEYS.referees(AUCTION_TAG),
    queryFn: async ({ pageParam }) => {
      const referees = await getReferees(AUCTION_TAG, {
        first: LIMIT,
        skip: pageParam
      });

      if (!referees.length) return [];

      const names = await getNames(referees.map(r => r.referee));

      return referees.map(referee => ({
        ...referee,
        name: names[referee.referee] || null
      }));
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < LIMIT) return null;

      return pages.length * LIMIT;
    }
  });
}
