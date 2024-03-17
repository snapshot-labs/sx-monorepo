import { CHAIN_IDS } from '@/helpers/constants';
import { SpaceMetadataTreasury } from '@/types';

export function useTreasury(treasuryData: SpaceMetadataTreasury) {
  const treasury = computed(() => {
    if (!treasuryData || !treasuryData.network || !treasuryData.address) return null;

    const chainId = CHAIN_IDS[treasuryData.network];
    if (!chainId || !treasuryData) return null;

    return {
      networkId: treasuryData.network,
      network: chainId,
      wallet: treasuryData.address,
      name: treasuryData.name
    };
  });

  return { treasury };
}
