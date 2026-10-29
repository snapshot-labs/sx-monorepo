import { MaybeRefOrGetter } from 'vue';
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

type OffchainNetwork = {
  chainId: string;
  name: string;
  logo: string;
  premium: boolean;
  spacesCount: number;
};

const networksById = ref(new Map<NetworkID, OffchainNetwork[]>());

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
          .map(network => network.chainId)
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
      const result = await getNetwork(id).api.getNetworks();

      networksById.value.set(
        id,
        Object.entries(result).map(([chainId, network]) => ({
          chainId,
          name: network.name,
          logo: network.logo,
          premium: network.premium,
          spacesCount: network.spaces_count
        }))
      );
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
