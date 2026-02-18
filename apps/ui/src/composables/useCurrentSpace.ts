import { getAddress, isAddress } from '@ethersproject/address';
import { resolver } from '@/helpers/resolver';
import { useSpaceQuery } from '@/queries/spaces';
import { NetworkID, Space } from '@/types';

export function useCurrentSpace() {
  const { space: whiteLabelSpace } = useWhiteLabel();
  const route = useRoute();

  const resolvedName = ref<{ networkId: NetworkID; address: string } | null>(
    null
  );
  const isResolving = ref(false);

  const spaceParam = computed(() => route.params.space as string | undefined);

  const primarySpace = computed<Space | null>(
    () => whiteLabelSpace.value ?? null
  );

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

  const needsResolution = computed(() => {
    const name = address.value;
    return !!name && !isAddress(name);
  });

  const resolvedNetworkId = computed(
    () => resolvedName.value?.networkId ?? networkId.value
  );
  const resolvedAddress = computed(
    () => resolvedName.value?.address ?? address.value
  );

  const { data: queriedSpace, isPending: isQueryPending } = useSpaceQuery({
    networkId: () =>
      primarySpace.value || (needsResolution.value && !resolvedName.value)
        ? null
        : resolvedNetworkId.value,
    spaceId: () =>
      primarySpace.value || (needsResolution.value && !resolvedName.value)
        ? null
        : resolvedAddress.value
  });

  const space = computed(
    () => primarySpace.value ?? queriedSpace.value ?? null
  );
  const isPending = computed(
    () => !primarySpace.value && (isResolving.value || isQueryPending.value)
  );

  watch(
    spaceParam,
    async param => {
      if (primarySpace.value || !param) {
        resolvedName.value = null;
        return;
      }

      const [network, name] = param.split(':') as [NetworkID, string];
      if (!name) {
        resolvedName.value = null;
        return;
      }

      isResolving.value = true;
      const result = await resolver.resolveName(name, network);
      if (result) {
        resolvedName.value = {
          networkId: result.networkId,
          address: isAddress(result.address)
            ? getAddress(result.address)
            : result.address
        };
      } else {
        resolvedName.value = null;
      }
      isResolving.value = false;
    },
    { immediate: true }
  );

  return {
    space,
    isPending
  };
}
