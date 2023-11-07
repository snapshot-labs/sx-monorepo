import { CHAIN_IDS } from '@/helpers/constants';
import { Space } from '@/types';

type NullableSpace = Space | undefined | null;

export function useTreasury(spaceRef: Ref<NullableSpace>) {
  const treasury = computed(() => {
    if (!spaceRef.value || !spaceRef.value.wallet) return null;

    const [networkId, wallet] = spaceRef.value.wallet.split(':');
    const chainId = CHAIN_IDS[networkId];
    if (!chainId || !wallet) return null;

    return {
      networkId,
      network: chainId,
      wallet
    };
  });

  return { treasury };
}
