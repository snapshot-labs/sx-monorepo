import { getAddress, isAddress } from '@ethersproject/address';
import { resolver } from '@/helpers/resolver';
import { useSpaceQuery } from '@/queries/spaces';
import { NetworkID, Space } from '@/types';

export function useCurrentSpace() {
  const { space: whiteLabelSpace } = useWhiteLabel();
  const { organization } = useOrganization();
  const route = useRoute();

  const spaceId = ref<{ networkId: NetworkID; address: string } | null>(null);
  const isResolving = ref(false);
  // Incrementing token used to ignore stale async resolution results.
  let resolveCounter = 0;

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
    if (spaceId.value) return spaceId.value.networkId;
    return spaceParam.value
      ? (spaceParam.value.split(':')[0] as NetworkID)
      : null;
  });

  const address = computed<string | null>(() => {
    if (primarySpace.value) return primarySpace.value.id;
    if (spaceId.value) return spaceId.value.address;
    return spaceParam.value ? spaceParam.value.split(':')[1] : null;
  });

  watch(
    spaceParam,
    async param => {
      const requestId = ++resolveCounter;

      spaceId.value = null;
      isResolving.value = false;

      if (primarySpace.value || !param) return;

      const [network, name] = param.split(':') as [NetworkID, string];
      if (!name) return;

      if (isAddress(name)) {
        spaceId.value = { networkId: network, address: getAddress(name) };
        return;
      }

      isResolving.value = true;
      try {
        const result = await resolver.resolveName(name, network);
        if (requestId !== resolveCounter) return;

        if (result) {
          spaceId.value = {
            networkId: result.networkId,
            address: isAddress(result.address)
              ? getAddress(result.address)
              : result.address
          };
        }
      } catch (err) {
        console.error('useCurrentSpace: resolveName failed', err);
        if (requestId === resolveCounter) spaceId.value = null;
      } finally {
        if (requestId === resolveCounter) {
          isResolving.value = false;
        }
      }
    },
    { immediate: true }
  );

  const { data: queriedSpace, isPending: isQueryPending } = useSpaceQuery({
    networkId: () =>
      primarySpace.value ? null : spaceId.value?.networkId ?? null,
    spaceId: () => (primarySpace.value ? null : spaceId.value?.address ?? null)
  });

  const space = computed(
    () => primarySpace.value ?? queriedSpace.value ?? null
  );
  const isPending = computed(
    () => !primarySpace.value && (isResolving.value || isQueryPending.value)
  );

  return {
    space,
    isPending,
    networkId,
    address
  };
}
