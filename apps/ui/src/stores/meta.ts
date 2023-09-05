import { defineStore } from 'pinia';
import { NetworkID } from '@/types';
import { getProvider } from '@/helpers/provider';
import { getNetwork } from '@/networks';
import { METADATA } from '@/networks/evm';

export const useMetaStore = defineStore('meta', () => {
  const currentTs = ref(new Map<NetworkID, number>());
  const currentBlocks = ref(new Map<NetworkID, number>());

  async function fetchBlock(network) {
    if (currentBlocks.value.get(network)) return;

    const provider = getProvider(getNetwork(network).baseChainId);

    try {
      const blockNumber = await provider.getBlockNumber();
      currentBlocks.value.set(network, blockNumber);
      currentTs.value.set(network, Date.now() / 1e3);
    } catch (e) {
      console.error(e);
    }
  }

  function getTsFromBlock(network, blockNum) {
    const networkBlockNum = currentBlocks.value.get(network) || 0;
    const blockDiff = networkBlockNum - blockNum;

    return (currentTs.value.get(network) || 0) - METADATA[network].blockTime * blockDiff;
  }

  return {
    currentTs,
    currentBlocks,
    fetchBlock,
    getTsFromBlock
  };
});
