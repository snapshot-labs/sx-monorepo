import { sanitizeUrl } from '@braintree/sanitize-url';
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { SUPPORTED_CHAIN_IDS as TOKENS_SUPPORTED_CHAIN_IDS } from '@/helpers/alchemy';
import { CHAIN_IDS } from '@/helpers/constants';
import { SUPPORTED_CHAIN_IDS as NFTS_SUPPORTED_CHAIN_IDS } from '@/helpers/opensea';
import { getNetwork } from '@/networks';
import { SpaceMetadataTreasury } from '@/types';

export function useTreasury(treasuryData: SpaceMetadataTreasury) {
  const treasury = computed(() => {
    if (!treasuryData) return null;

    const networkId = treasuryData.network;

    const chainId =
      treasuryData.chainId ?? (networkId ? CHAIN_IDS[networkId] : null);
    if (!chainId) return null;

    return {
      networkId,
      network: chainId,
      wallet: treasuryData.address,
      name: treasuryData.name,
      supportsTokens: TOKENS_SUPPORTED_CHAIN_IDS.includes(chainId as any),
      supportsNfts: NFTS_SUPPORTED_CHAIN_IDS.includes(chainId as any)
    };
  });

  const currentNetwork = computed(() => {
    if (!treasury.value?.networkId) return null;

    try {
      return getNetwork(treasury.value.networkId);
    } catch (e) {
      return null;
    }
  });

  function getExplorerUrl(address: string, type: 'address' | 'token') {
    if (!treasury.value) return null;

    let url = '';
    if (currentNetwork.value) {
      url = currentNetwork.value.helpers.getExplorerUrl(address, type);
    } else if (treasury.value.network) {
      url = `${networks[treasury.value.network].explorer.url}/${type}/${address}`;
    } else {
      return null;
    }

    return sanitizeUrl(url);
  }

  return { treasury, getExplorerUrl };
}
