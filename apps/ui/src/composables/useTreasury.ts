import { SUPPORTED_CHAIN_IDS as TOKENS_SUPPORTED_CHAIN_IDS } from '@/helpers/alchemy';
import { getGenericExplorerUrl } from '@/helpers/generic';
import { SUPPORTED_CHAIN_IDS as NFTS_SUPPORTED_CHAIN_IDS } from '@/helpers/opensea';
import { SpaceMetadataTreasury } from '@/types';

export function useTreasury(treasuryData: SpaceMetadataTreasury) {
  const treasury = computed(() => {
    if (!treasuryData) return null;

    const { chainId, address, name } = treasuryData;

    if (!chainId) return null;

    return {
      network: chainId,
      wallet: address,
      name,
      supportsTokens: TOKENS_SUPPORTED_CHAIN_IDS.includes(
        chainId.toString() as any
      ),
      supportsNfts: NFTS_SUPPORTED_CHAIN_IDS.includes(chainId.toString() as any)
    };
  });

  function getExplorerUrl(address: string, type: 'address' | 'token') {
    if (!treasury.value) return null;

    return getGenericExplorerUrl(treasury.value.network, address, type);
  }

  return { treasury, getExplorerUrl };
}
