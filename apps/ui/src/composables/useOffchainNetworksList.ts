import snapshotJsNetworks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getNetwork, metadataNetwork } from '@/networks';

const usage = ref<Record<string, number | undefined> | null>(null);
const premiumChainIds = ref<Set<string>>(new Set());
const loaded = ref(false);
const loading = ref(false);

export function useOffchainNetworksList(hideUnused = false) {
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
    if (loading.value || loaded.value) return;

    loading.value = true;

    try {
      const network = getNetwork(metadataNetwork);
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
    } finally {
      loading.value = false;
    }
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
