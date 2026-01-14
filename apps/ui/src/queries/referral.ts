import { useInfiniteQuery, useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import {
  AUCTION_TAG,
  getReferees,
  getUserReferees,
  getUserReferral,
  Referral
} from '@/helpers/auction/referral';
import { getNames } from '@/helpers/stamp';
import { NetworkID } from '@/types';

const LIMIT = 20;
const USER_REFEREES_LIMIT = 1000;

export const REFERRAL_KEYS = {
  all: ['referral'] as const,
  network: (networkId: MaybeRefOrGetter<NetworkID>) =>
    [...REFERRAL_KEYS.all, networkId] as const,
  userReferral: (
    networkId: MaybeRefOrGetter<NetworkID>,
    tag: string,
    account: MaybeRefOrGetter<string | null>
  ) => [...REFERRAL_KEYS.network(networkId), 'user', tag, account],
  userReferees: (
    networkId: MaybeRefOrGetter<NetworkID>,
    tag: string,
    account: MaybeRefOrGetter<string | null>
  ) => [...REFERRAL_KEYS.network(networkId), 'user-referees', tag, account],
  referees: (networkId: MaybeRefOrGetter<NetworkID>, tag: string) => [
    ...REFERRAL_KEYS.network(networkId),
    'referees',
    tag
  ]
};

export function useUserReferralQuery({
  networkId,
  account
}: {
  networkId: MaybeRefOrGetter<NetworkID>;
  account: MaybeRefOrGetter<string | null>;
}) {
  return useQuery({
    queryKey: REFERRAL_KEYS.userReferral(networkId, AUCTION_TAG, account),
    queryFn: async () => {
      const accountValue = toValue(account);
      if (!accountValue) return null;

      let referral: Referral | null;
      try {
        referral = await getUserReferral(
          toValue(networkId),
          AUCTION_TAG,
          accountValue
        );
      } catch (err) {
        if (err instanceof Error && err.message.includes('Row not found')) {
          return null;
        }

        throw err;
      }

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

export function useRefereesQuery({
  networkId
}: {
  networkId: MaybeRefOrGetter<NetworkID>;
}) {
  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: REFERRAL_KEYS.referees(networkId, AUCTION_TAG),
    queryFn: async ({ pageParam }) => {
      const referees = await getReferees(toValue(networkId), AUCTION_TAG, {
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

export function useUserRefereesQuery({
  networkId,
  account
}: {
  networkId: MaybeRefOrGetter<NetworkID>;
  account: MaybeRefOrGetter<string | null>;
}) {
  return useQuery({
    queryKey: REFERRAL_KEYS.userReferees(networkId, AUCTION_TAG, account),
    queryFn: async () => {
      const accountValue = toValue(account);
      if (!accountValue) return null;

      let referees: Referral[] = [];
      let hasMore = true;

      while (hasMore) {
        const newReferees = await getUserReferees(
          toValue(networkId),
          AUCTION_TAG,
          accountValue,
          { first: USER_REFEREES_LIMIT, skip: referees.length }
        );

        referees = referees.concat(newReferees);
        hasMore = newReferees.length === USER_REFEREES_LIMIT;
      }

      return referees;
    },
    enabled: computed(() => !!toValue(account))
  });
}
