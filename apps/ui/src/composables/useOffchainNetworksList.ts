import { MaybeRefOrGetter } from 'vue';
import { getNetwork } from '@/networks';
import { HubNetwork } from '@/networks/types';
import { NetworkID } from '@/types';

const networksById = ref(new Map<NetworkID, HubNetwork[]>());

export function useOffchainNetworksList(
  networkId: MaybeRefOrGetter<NetworkID>,
  hideUnused = false
) {
  const allNetworks = computed(() =>
    networksById.value.get(toValue(networkId))
  );

  const loaded = computed(() => !!allNetworks.value);

  const premiumChainIds = computed(
    () =>
      new Set(
        allNetworks.value
          ?.filter(network => network.premium)
          .map(network => network.id)
      )
  );

  const networks = computed(() =>
    (allNetworks.value ?? [])
      .filter(network => !hideUnused || network.spacesCount > 0)
      .sort((a, b) => b.spacesCount - a.spacesCount)
  );

  async function loadNetwork(id: NetworkID) {
    if (networksById.value.has(id)) return;

    try {
      networksById.value.set(id, await getNetwork(id).api.getNetworks());
    } catch (err) {
      throw new Error(`Failed to load networks for ${id}: ${err}`);
    }
  }

  watch(() => toValue(networkId), loadNetwork, { immediate: true });

  return {
    networks,
    loaded,
    premiumChainIds
  };
}
