import { resolver } from '@/helpers/resolver';
import { NetworkID } from '@/types';

export function useResolve(id: Ref<string>) {
  const resolved = ref(false);
  const networkId: Ref<NetworkID | null> = ref(null);
  const address: Ref<string | null> = ref(null);

  const { isWhiteLabel, space } = useWhiteLabel();
  const { organization } = useOrganization();

  watch(
    [id, organization],
    async ([id]) => {
      const primarySpace =
        (isWhiteLabel.value ? space.value : null) ??
        organization.value?.spaces[0];

      if (primarySpace) {
        networkId.value = primarySpace.network;
        address.value = primarySpace.id;
        resolved.value = true;
        return;
      }

      if (!id) return;

      resolved.value = false;

      const resolvedName = await resolver.resolveName(id);
      if (resolvedName) {
        networkId.value = resolvedName.networkId;
        address.value = resolvedName.address;
        resolved.value = true;
      }
    },
    { immediate: true }
  );

  return {
    resolved,
    networkId,
    address
  };
}
