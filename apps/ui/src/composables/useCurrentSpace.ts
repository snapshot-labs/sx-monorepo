import { getAddress, isAddress } from '@ethersproject/address';
import { skipToken, useQuery } from '@tanstack/vue-query';
import { resolver } from '@/helpers/resolver';
import { useSpaceQuery } from '@/queries/spaces';
import { NetworkID, Space } from '@/types';

type SpaceId = { networkId: NetworkID; address: string };

export function useCurrentSpace() {
  const { space: whiteLabelSpace } = useWhiteLabel();
  const { organization } = useOrganization();
  const route = useRoute();

  const spaceParam = computed(() => route.params.space as string | undefined);

  const primarySpace = computed<Space | null>(
    () => whiteLabelSpace.value ?? organization.value?.spaces[0] ?? null
  );

  const orgRouteSpace = computed<Space | null>(
    () =>
      organization.value?.spaces.find(
        s => spaceParam.value === `${s.network}:${s.id}`
      ) ?? null
  );

  const knownSpace = computed(() => orgRouteSpace.value ?? primarySpace.value);

  const queryFn = computed<typeof skipToken | (() => Promise<SpaceId | null>)>(
    () => {
      const param = spaceParam.value;
      if (knownSpace.value || !param) return skipToken;

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

  const { data: spaceId, isPending: isResolving } = useQuery({
    queryKey: ['resolveSpace', () => spaceParam.value],
    queryFn
  });

  const { data: queriedSpace, isPending: isQueryPending } = useSpaceQuery({
    networkId: () =>
      knownSpace.value ? null : spaceId.value?.networkId ?? null,
    spaceId: () => (knownSpace.value ? null : spaceId.value?.address ?? null)
  });

  const space = computed<Space | null>(
    () => knownSpace.value ?? queriedSpace.value ?? null
  );

  const isPending = computed(
    () => !knownSpace.value && (isResolving.value || isQueryPending.value)
  );

  const networkId = computed<NetworkID | null>(() => {
    if (knownSpace.value) return knownSpace.value.network;
    if (spaceId.value) return spaceId.value.networkId;
    return spaceParam.value
      ? (spaceParam.value.split(':')[0] as NetworkID)
      : null;
  });

  const address = computed<string | null>(() => {
    if (knownSpace.value) return knownSpace.value.id;
    if (spaceId.value) return spaceId.value.address;
    return spaceParam.value ? spaceParam.value.split(':')[1] : null;
  });

  return {
    space,
    isPending,
    networkId,
    address
  };
}
