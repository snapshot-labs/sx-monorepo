import { sanitizeUrl } from '@braintree/sanitize-url';
import { SUPPORTED_CHAIN_IDS as TOKENS_SUPPORTED_CHAIN_IDS } from '@/helpers/alchemy';
import { getGenericExplorerUrl } from '@/helpers/explorer';
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
      supportsTokens: TOKENS_SUPPORTED_CHAIN_IDS.includes(chainId as any),
      supportsNfts: NFTS_SUPPORTED_CHAIN_IDS.includes(chainId as any)
    };
  });

  function getExplorerUrl(address: string, type: 'address' | 'token') {
    if (!treasury.value) return null;

    let url: string | null = null;
    if (treasury.value.network) {
      url = getGenericExplorerUrl(treasury.value.network, address, type);
    }

    if (!url) return null;

    return sanitizeUrl(url);
  }

  return { treasury, getExplorerUrl };
}
