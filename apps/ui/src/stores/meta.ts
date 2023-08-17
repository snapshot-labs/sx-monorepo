import { defineStore } from 'pinia';
import { NetworkID } from '@/types';
import { getProvider } from '@/helpers/provider';
import { enabledNetworks, getNetwork } from '@/networks';

export const useMetaStore = defineStore('meta', () => {
  const loaded = ref<boolean>(false);
  const currentTs = ref<number>(Date.now() / 1e3);
  const currentBlocks = ref(new Map<NetworkID, number>());

  async function fetchBlocks() {
    const promises = enabledNetworks.map(async network => {
      const provider = getProvider(getNetwork(network).baseChainId);

      try {
        const blockNumber = await provider.getBlockNumber();
        currentBlocks.value.set(network, blockNumber);
      } catch (e) {
        console.error(e);
      }
    });

    await Promise.all(promises);

    currentTs.value = Date.now() / 1e3;
    loaded.value = true;
  }

  return {
    loaded,
    currentTs,
    currentBlocks,
    fetchBlocks
  };
});
