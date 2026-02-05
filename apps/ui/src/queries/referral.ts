import { useInfiniteQuery, useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import {
  getPartnerStatistics,
  getUserInvite,
  getUserInvites,
  Invite
} from '@/helpers/auction/referral';
import { getNames } from '@/helpers/stamp';
import { NetworkID } from '@/types';

const LIMIT = 20;
const USER_REFEREES_LIMIT = 1000;

export const REFERRAL_KEYS = {
  all: ['referral'] as const,
  network: (networkId: MaybeRefOrGetter<NetworkID>) =>
    [...REFERRAL_KEYS.all, networkId] as const,
  userInvite: (
    networkId: MaybeRefOrGetter<NetworkID>,
    tag: MaybeRefOrGetter<string>,
    account: MaybeRefOrGetter<string | null>
  ) => [...REFERRAL_KEYS.network(networkId), 'userInvite', tag, account],
  userInvites: (
    networkId: MaybeRefOrGetter<NetworkID>,
    tag: MaybeRefOrGetter<string>,
    account: MaybeRefOrGetter<string | null>
  ) => [...REFERRAL_KEYS.network(networkId), 'userInvites', tag, account],
  partnerStatistics: (
    networkId: MaybeRefOrGetter<NetworkID>,
    tag: MaybeRefOrGetter<string>
  ) => [...REFERRAL_KEYS.network(networkId), 'partnerStatistics', tag]
};

export function useUserInviteQuery({
  networkId,
  auctionTag,
  account
}: {
  networkId: MaybeRefOrGetter<NetworkID>;
  auctionTag: MaybeRefOrGetter<string>;
  account: MaybeRefOrGetter<string | null>;
}) {
  return useQuery({
    queryKey: REFERRAL_KEYS.userInvite(networkId, auctionTag, account),
    queryFn: async () => {
      const accountValue = toValue(account);
      if (!accountValue) return null;

      let invite: Invite | null;
      try {
        invite = await getUserInvite(
          toValue(networkId),
          toValue(auctionTag),
          accountValue
        );
      } catch (err) {
        if (err instanceof Error && err.message.includes('Row not found')) {
          return null;
        }

        throw err;
      }

      if (!invite) return null;

      const names = await getNames([invite.partner]);

      return {
        ...invite,
        partnerName: names[invite.partner] || null
      };
    },
    enabled: computed(() => !!toValue(account))
  });
}

export function usePartnerStatisticsQuery({
  networkId,
  auctionTag
}: {
  networkId: MaybeRefOrGetter<NetworkID>;
  auctionTag: MaybeRefOrGetter<string>;
}) {
  return useInfiniteQuery({
    initialPageParam: 0,
    queryKey: REFERRAL_KEYS.partnerStatistics(networkId, auctionTag),
    queryFn: async ({ pageParam }) => {
      const partnerStatistics = await getPartnerStatistics(
        toValue(networkId),
        toValue(auctionTag),
        {
          first: LIMIT,
          skip: pageParam
        }
      );

      if (!partnerStatistics.length) return [];

      const names = await getNames(partnerStatistics.map(r => r.partner));

      return partnerStatistics.map(statistic => ({
        ...statistic,
        name: names[statistic.partner] || null
      }));
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < LIMIT) return null;

      return pages.length * LIMIT;
    }
  });
}

export function useUserInvitesQuery({
  networkId,
  auctionTag,
  account
}: {
  networkId: MaybeRefOrGetter<NetworkID>;
  account: MaybeRefOrGetter<string | null>;
  auctionTag: MaybeRefOrGetter<string>;
}) {
  return useQuery({
    queryKey: REFERRAL_KEYS.userInvites(networkId, auctionTag, account),
    queryFn: async () => {
      const accountValue = toValue(account);
      if (!accountValue) return null;

      let invites: Invite[] = [];
      let hasMore = true;

      while (hasMore) {
        const newInvites = await getUserInvites(
          toValue(networkId),
          toValue(auctionTag),
          accountValue,
          { first: USER_REFEREES_LIMIT, skip: invites.length }
        );

        invites = invites.concat(newInvites);
        hasMore = newInvites.length === USER_REFEREES_LIMIT;
      }

      return invites;
    },
    enabled: computed(() => !!toValue(account))
  });
}
