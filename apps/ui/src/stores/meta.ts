import { evmNetworks as evmConfigs } from '@snapshot-labs/sx';
import { defineStore } from 'pinia';
import { getProvider } from '@/helpers/provider';
import { evmNetworks, getNetwork } from '@/networks';
import { NetworkID } from '@/types';

export const useMetaStore = defineStore('meta', () => {
  const currentTs = ref(new Map<NetworkID, number>());
  const currentBlocks = ref(new Map<NetworkID, number>());

  function getConfigBlockTime(networkId: NetworkID) {
    if (networkId in evmConfigs) {
      return evmConfigs[networkId as keyof typeof evmConfigs].Meta.blockTime;
    }

    throw new Error('Unsupported network');
  }

  function getCurrent(networkId: NetworkID): number | undefined {
    if (evmNetworks.includes(networkId))
      return currentBlocks.value.get(networkId);
    return currentTs.value.get(networkId);
  }

  async function fetchBlock(networkId: NetworkID) {
    if (currentBlocks.value.get(networkId)) return;

    const provider = getProvider(getNetwork(networkId).currentChainId);

    try {
      const blockNumber = await provider.getBlockNumber();
      currentBlocks.value.set(networkId, blockNumber);
      currentTs.value.set(networkId, Math.floor(Date.now() / 1000));
    } catch (e) {
      console.error(e);
    }
  }

  function getCurrentFromDuration(networkId: NetworkID, duration: number) {
    const network = getNetwork(networkId);

    if (network.currentUnit === 'second') return duration;

    return Math.round(duration / getConfigBlockTime(networkId));
  }

  function getDurationFromCurrent(networkId: NetworkID, current: number) {
    const network = getNetwork(networkId);

    if (network.currentUnit === 'second') return current;

    return Math.round(current * getConfigBlockTime(networkId));
  }

  function getTsFromCurrent(networkId: NetworkID, current: number) {
    if (!evmNetworks.includes(networkId)) return current;

    const networkBlockNum = currentBlocks.value.get(networkId) || 0;
    const blockDiff = networkBlockNum - current;

    return (
      (currentTs.value.get(networkId) || 0) -
      getConfigBlockTime(networkId) * blockDiff
    );
  }

  return {
    getCurrent,
    fetchBlock,
    getCurrentFromDuration,
    getDurationFromCurrent,
    getTsFromCurrent
  };
});
