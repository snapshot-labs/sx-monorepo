import snapshotJsNetworks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getNetwork } from '@/networks';
import { ChainId, NetworkID } from '@/types';

const usage = ref<Record<ChainId, number | undefined> | null>(null);
const premiumChainIds = ref<Set<ChainId>>(new Set());
const loaded = ref(false);

export function useOffchainNetworksList(
  networkId: NetworkID,
  hideUnused = false
) {
  const networks = computed(() => {
    const rawNetworks = Object.values(snapshotJsNetworks).filter(
      ({ chainId }) => typeof chainId === 'number'
    );

    rawNetworks.forEach(network => {
      if (premiumChainIds.value.has(network.chainId)) {
        network.premium = true;
      }
    });

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
    const network = getNetwork(networkId);
    const networks = await network.api.getNetworks();

    usage.value = Object.keys(networks).reduce(
      (acc, chainId) => {
        acc[chainId] = networks[chainId].spaces_count;
        return acc;
      },
      {} as Record<ChainId, number>
    );

    Object.keys(networks).forEach(chainId => {
      if (networks[chainId].premium) {
        premiumChainIds.value.add(Number(chainId));
      }
    });

    loaded.value = true;
  }

  onMounted(() => {
    load();
  });

  return {
    networks,
    premiumChainIds
  };
}
