import snapshotJsNetworks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getNetwork, metadataNetwork } from '@/networks';
import { NetworkID } from '@/types';

const usage = ref<Record<string, number | undefined> | null>(null);
const premiumByNetwork = ref(new Map<NetworkID, Set<string>>());
const loadingNetworks = new Set<NetworkID>();

export function useOffchainNetworksList(
  networkId: NetworkID,
  hideUnused = false
) {
  const loaded = computed(() => premiumByNetwork.value.has(networkId));

  const premiumChainIds = computed(
    () => premiumByNetwork.value.get(networkId) ?? new Set<string>()
  );

  const networks = computed(() => {
    const rawNetworks = Object.values(snapshotJsNetworks);

    const usageValue = usage.value;
    if (!usageValue) return rawNetworks;

    return [
      ...(hideUnused
        ? rawNetworks.filter(network => (usageValue[network.chainId] || 0) > 0)
        : rawNetworks)
    ].sort((a, b) => {
      const aUsage = usageValue[a.chainId] || 0;
      const bUsage = usageValue[b.chainId] || 0;

      return bUsage - aUsage;
    });
  });

  async function loadNetwork(id: NetworkID) {
    if (loadingNetworks.has(id) || premiumByNetwork.value.has(id)) return;

    loadingNetworks.add(id);

    try {
      const network = getNetwork(id);
      const result = await network.api.getNetworks();

      // Only populate usage from metadataNetwork to prevent testnet counts from overwriting mainnet
      if (id === metadataNetwork) {
        usage.value = Object.keys(result).reduce((acc, chainId) => {
          acc[chainId] = result[chainId].spaces_count;
          return acc;
        }, {});
      }

      const premium = new Set<string>();
      Object.keys(result).forEach(chainId => {
        if (result[chainId].premium) {
          premium.add(chainId);
        }
      });

      premiumByNetwork.value.set(id, premium);
    } finally {
      loadingNetworks.delete(id);
    }
  }

  onMounted(() => {
    loadNetwork(networkId);
  });

  return {
    networks,
    loaded,
    premiumChainIds
  };
}
