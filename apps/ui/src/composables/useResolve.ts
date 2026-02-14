import { getAddress, isAddress } from '@ethersproject/address';
import { resolver } from '@/helpers/resolver';
import { NetworkID } from '@/types';

export function useResolve(id: Ref<string>) {
  const resolved = ref(false);
  const networkId: Ref<NetworkID | null> = ref(null);
  const address: Ref<string | null> = ref(null);

  const { isWhiteLabel, resolved: whiteLabelResolved, space } = useWhiteLabel();

  watch(
    [id, whiteLabelResolved],
    async ([id, whiteLabelResolved]) => {
      if (whiteLabelResolved && isWhiteLabel.value && space.value) {
        networkId.value = space.value.network;
        address.value = space.value.id;
        resolved.value = true;

        return true;
      }

      if (!id) return;

      resolved.value = false;

      const [network, name] = id.split(':') as [NetworkID, string];
      const resolvedName = await resolver.resolveName(name, network);
      if (resolvedName) {
        networkId.value = resolvedName.networkId;
        address.value = isAddress(resolvedName.address)
          ? getAddress(resolvedName.address)
          : resolvedName.address;
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
