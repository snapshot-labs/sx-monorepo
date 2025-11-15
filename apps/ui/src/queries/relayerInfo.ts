import { useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter, toValue } from 'vue';
import { getNetwork } from '@/networks';
import { Space } from '@/types';

type RelayerInfo = {
  address: string;
  balance: number;
  ticker: string;
  hasMinimumBalance: boolean;
};

export function useRelayerInfoQuery(space: MaybeRefOrGetter<Space>) {
  return useQuery({
    queryKey: [
      'relayerBalance',
      () => ({
        spaceId: toValue(space).id,
        networkId: toValue(space).network
      })
    ],
    queryFn: async () => {
      return getNetwork(toValue(space).network).helpers.getRelayerInfo(
        toValue(space).id,
        toValue(space).network
      ) as Promise<RelayerInfo>;
    },
    staleTime: Infinity
  });
}
