import snapshotJsNetworks from '@snapshot-labs/snapshot.js/src/networks.json';
import { MaybeRefOrGetter } from 'vue';
import { getNetwork, metadataNetwork } from '@/networks';
import { NetworkID } from '@/types';

const usage = ref<Record<string, number | undefined> | null>(null);
const premiumByNetwork = ref(new Map<NetworkID, Set<string>>());
const loadingNetworks = new Set<NetworkID>();

export function useOffchainNetworksList(
  networkId: MaybeRefOrGetter<NetworkID>,
  hideUnused = false
) {
  const loaded = computed(() => premiumByNetwork.value.has(toValue(networkId)));

  const premiumChainIds = computed(
    () => premiumByNetwork.value.get(toValue(networkId)) ?? new Set<string>()
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
        usage.value = Object.keys(result).reduce(
          (acc: Record<string, number>, chainId) => {
            acc[chainId] = result[chainId].spaces_count;
            return acc;
          },
          {}
        );
      }

      const premium = new Set<string>();
      Object.keys(result).forEach(chainId => {
        if (result[chainId].premium) {
          premium.add(chainId);
        }
      });

      premiumByNetwork.value.set(id, premium);
    } catch (err) {
      throw new Error(`Failed to load networks for ${id}: ${err}`);
    } finally {
      loadingNetworks.delete(id);
    }
  }

  watch(() => toValue(networkId), loadNetwork, { immediate: true });

  return {
    networks,
    loaded,
    premiumChainIds
  };
}
