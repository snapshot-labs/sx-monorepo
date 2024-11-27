import snapshotJsNetworks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getNetwork } from '@/networks';
import { ChainId, NetworkID } from '@/types';

const usage = ref<Record<ChainId, number | undefined> | null>(null);
const loaded = ref(false);

export function useOffchainNetworksList(
  networkId: NetworkID,
  hideUnused = false
) {
  async function getUsage() {
    if (loaded.value) return;

    const network = getNetwork(networkId);

    usage.value = await network.api.getNetworksUsage();
  }

  const networks = computed(() => {
    const rawNetworks = Object.values(snapshotJsNetworks).filter(
      ({ chainId }) => typeof chainId === 'number'
    );

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

  return {
    getUsage,
    networks
  };
}
