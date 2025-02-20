import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import { compareAddresses } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { Space } from '@/types';

export const SPACE_CONTROLLER_KEY = (space: MaybeRefOrGetter<Space | null>) => [
  'spaceController',
  () => {
    const spaceValue = toValue(space);
    return spaceValue ? `${spaceValue.network}:${spaceValue.id}` : null;
  }
];

export function useSpaceController(space: MaybeRefOrGetter<Space | null>) {
  const queryClient = useQueryClient();
  const { web3 } = useWeb3();

  const { data } = useQuery({
    queryKey: SPACE_CONTROLLER_KEY(space),
    queryFn: async () => {
      const spaceValue = toValue(space);
      if (!spaceValue) return null;

      const network = getNetwork(spaceValue.network);
      return network.helpers.getSpaceController(spaceValue);
    },
    enabled: () => toValue(space) !== null,
    staleTime: 5 * 60 * 1000
  });

  const controller = computed(() => data.value ?? null);
  const isController = computed(() => {
    if (controller.value === null) return false;

    return compareAddresses(controller.value, web3.value.account);
  });

  return {
    controller,
    isController,
    invalidateController: () =>
      queryClient.invalidateQueries({
        queryKey: SPACE_CONTROLLER_KEY(space)
      })
  };
}
