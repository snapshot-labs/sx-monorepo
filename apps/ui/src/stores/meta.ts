import { defineStore } from 'pinia';
import { NetworkID } from '@/types';
import { getProvider } from '@/helpers/provider';
import { evmNetworks, getNetwork } from '@/networks';
import { METADATA } from '@/networks/evm';

export const useMetaStore = defineStore('meta', () => {
  const currentTs = ref(new Map<NetworkID, number>());
  const currentBlocks = ref(new Map<NetworkID, number>());

  function getCurrent(networkId: NetworkID): number | undefined {
    if (evmNetworks.includes(networkId)) return currentBlocks.value.get(networkId);
    return currentTs.value.get(networkId);
  }

  async function fetchBlock(networkId: NetworkID) {
    if (currentBlocks.value.get(networkId)) return;

    const provider = getProvider(getNetwork(networkId).baseChainId);

    try {
      const blockNumber = await provider.getBlockNumber();
      currentBlocks.value.set(networkId, blockNumber);
      currentTs.value.set(networkId, Math.floor(Date.now() / 1e3));
    } catch (e) {
      console.error(e);
    }
  }

  function getTsFromCurrent(networkId: NetworkID, current: number) {
    if (!evmNetworks.includes(networkId)) return current;

    const networkBlockNum = currentBlocks.value.get(networkId) || 0;
    const blockDiff = networkBlockNum - current;

    return (currentTs.value.get(networkId) || 0) - METADATA[networkId].blockTime * blockDiff;
  }

  return {
    getCurrent,
    fetchBlock,
    getTsFromCurrent
  };
});
