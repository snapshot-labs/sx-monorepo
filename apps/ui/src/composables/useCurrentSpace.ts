import { getAddress, isAddress } from '@ethersproject/address';
import { skipToken, useQuery } from '@tanstack/vue-query';
import { resolver } from '@/helpers/resolver';
import { useSpaceQuery } from '@/queries/spaces';
import { NetworkID, Space } from '@/types';

type SpaceId = { networkId: NetworkID; address: string };

export function useCurrentSpace() {
  const { space: whiteLabelSpace } = useWhiteLabel();
  const route = useRoute();

  const spaceParam = computed(() => route.params.space as string | undefined);

  const primarySpace = computed<Space | null>(
    () => whiteLabelSpace.value ?? null
  );

  const queryFn = computed<typeof skipToken | (() => Promise<SpaceId | null>)>(
    () => {
      const param = spaceParam.value;
      if (primarySpace.value || !param) return skipToken;

      const [network, name] = param.split(':') as [NetworkID, string];
      if (!name) return skipToken;

      return async () => {
        if (isAddress(name)) {
          return { networkId: network, address: getAddress(name) };
        }

        const result = await resolver.resolveName(name, network);
        if (!result) return null;

        return {
          networkId: result.networkId,
          address: isAddress(result.address)
            ? getAddress(result.address)
            : result.address
        };
      };
    }
  );

  const { data: spaceId, isFetching: isResolving } = useQuery({
    queryKey: ['resolveSpace', () => spaceParam.value],
    queryFn
  });

  const { data: queriedSpace, isFetching: isQueryFetching } = useSpaceQuery({
    networkId: () =>
      primarySpace.value ? null : spaceId.value?.networkId ?? null,
    spaceId: () => (primarySpace.value ? null : spaceId.value?.address ?? null)
  });

  const space = computed<Space | null>(
    () => primarySpace.value ?? queriedSpace.value ?? null
  );

  const isPending = computed(
    () => !primarySpace.value && (isResolving.value || isQueryFetching.value)
  );

  return {
    space,
    isPending
  };
}
