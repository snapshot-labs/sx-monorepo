import { resolver } from '@/helpers/resolver';
import { useSpaceQuery } from '@/queries/spaces';
import { NetworkID, Space } from '@/types';

export function useCurrentSpace() {
  const { space: whiteLabelSpace } = useWhiteLabel();
  const { organization } = useOrganization();
  const route = useRoute();

  const spaceParam = computed(() => route.params.space as string | undefined);

  const primarySpace = computed<Space | null>(() => {
    if (whiteLabelSpace.value) return whiteLabelSpace.value;

    const org = organization.value;
    if (!org) return null;

    if (spaceParam.value) {
      const match = org.spaces.find(
        s => spaceParam.value === `${s.network}:${s.id}`
      );
      if (match) return match;
    }

    return org.spaces[0] ?? null;
  });

  const networkId = computed<NetworkID | null>(() => {
    if (primarySpace.value) return primarySpace.value.network;
    return spaceParam.value
      ? (spaceParam.value.split(':')[0] as NetworkID)
      : null;
  });

  const address = computed<string | null>(() => {
    if (primarySpace.value) return primarySpace.value.id;
    return spaceParam.value ? spaceParam.value.split(':')[1] : null;
  });

  const resolvedName = ref<{ networkId: NetworkID; address: string } | null>(
    null
  );

  watch(
    spaceParam,
    async param => {
      if (primarySpace.value || !param) {
        resolvedName.value = null;
        return;
      }

      // Only resolve if param doesn't already contain a network prefix
      if (param.includes(':')) return;

      const result = await resolver.resolveName(param);
      resolvedName.value = result ?? null;
    },
    { immediate: true }
  );

  const resolvedNetworkId = computed(
    () => resolvedName.value?.networkId ?? networkId.value
  );
  const resolvedAddress = computed(
    () => resolvedName.value?.address ?? address.value
  );

  const { data: queriedSpace, isPending: isQueryPending } = useSpaceQuery({
    networkId: () => (primarySpace.value ? null : resolvedNetworkId.value),
    spaceId: () => (primarySpace.value ? null : resolvedAddress.value)
  });

  const space = computed(
    () => primarySpace.value ?? queriedSpace.value ?? null
  );
  const isPending = computed(() => !primarySpace.value && isQueryPending.value);

  return {
    space,
    isPending,
    networkId: resolvedNetworkId,
    address: resolvedAddress
  };
}
