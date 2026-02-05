import snapshotJsNetworks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

const usage = ref<Record<string, number | undefined> | null>(null);
const premiumChainIds = ref<Set<string>>(new Set());
const loaded = ref(false);

export function useOffchainNetworksList(
  networkId: NetworkID,
  hideUnused = false
) {
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

  async function load() {
    if (loaded.value) return;

    const network = getNetwork(networkId);
    const networks = await network.api.getNetworks();

    usage.value = Object.keys(networks).reduce((acc, chainId) => {
      acc[chainId] = networks[chainId].spaces_count;
      return acc;
    }, {});

    Object.keys(networks).forEach(chainId => {
      if (networks[chainId].premium) {
        premiumChainIds.value.add(chainId);
      }
    });

    loaded.value = true;
  }

  onMounted(() => {
    load();
  });

  return {
    networks,
    loaded,
    premiumChainIds
  };
}
