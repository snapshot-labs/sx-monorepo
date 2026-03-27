import { getAddress, isAddress } from '@ethersproject/address';
import { skipToken, useQuery } from '@tanstack/vue-query';
import { toSpaceId as resolveOrgSpaceId } from '@/helpers/organizations';
import { resolver } from '@/helpers/resolver';
import { useSpaceQuery } from '@/queries/spaces';
import { NetworkID, Space } from '@/types';

type SpaceId = { networkId: NetworkID; address: string };

export function useCurrentSpace() {
  const { space: whiteLabelSpace } = useWhiteLabel();
  const { organization } = useOrganization();
  const route = useRoute();

  const spaceParam = computed(() => route.params.space as string | undefined);
  const { spaceType, townhallSpaceId } = useTownhallSpace(spaceParam);

  const primarySpace = computed<Space | null>(
    () => whiteLabelSpace.value ?? organization.value?.spaces[0] ?? null
  );

  const orgRouteSpace = computed<Space | null>(() => {
    const param = spaceParam.value;
    if (!param || !organization.value) return null;

    const resolved = resolveOrgSpaceId(organization.value, param);
    if (!resolved) return null;

    return (
      organization.value.spaces.find(
        s => resolved === `${s.network}:${s.id}`
      ) ?? null
    );
  });

  // Space already available from org or white-label context, no query needed
  const knownSpace = computed(() => {
    if (whiteLabelSpace.value) return whiteLabelSpace.value;
    if (orgRouteSpace.value) return orgRouteSpace.value;
    if (!spaceParam.value) return primarySpace.value;
    if (organization.value) return primarySpace.value;
    return null;
  });

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

  // Space fetched from API when not available locally
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

  return {
    spaceType,
    townhallSpaceId,
    space,
    isPending
  };
}
