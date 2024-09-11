import { resolver } from '@/helpers/resolver';
import { NetworkID } from '@/types';

export function useResolve(id: Ref<string>) {
  const resolved = ref(false);
  const networkId: Ref<NetworkID | null> = ref(null);
  const address: Ref<string | null> = ref(null);

  const { app } = useApp();

  watch(
    id,
    async id => {
      if (app.value.isWhiteLabel) {
        if (!app.value.space) return;

        networkId.value = app.value.space.network;
        address.value = app.value.space.id;
        resolved.value = true;

        return true;
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
