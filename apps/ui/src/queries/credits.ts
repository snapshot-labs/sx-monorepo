import { useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter, toValue } from 'vue';
import { getSpaceCredits } from '@/helpers/mana';
import { getProvider } from '@/helpers/provider';
import { getNetwork } from '@/networks';
import { Space } from '@/types';

export function useSpaceCreditsQuery(space: MaybeRefOrGetter<Space>) {
  return useQuery({
    queryKey: [
      'spaceCredits',
      () => toValue(space).network,
      () => toValue(space).id
    ],
    queryFn: () => {
      const { id, network } = toValue(space);

      return getSpaceCredits(
        id,
        network,
        getProvider(Number(getNetwork(network).chainId))
      );
    }
  });
}
