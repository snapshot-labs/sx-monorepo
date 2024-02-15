import { CHAIN_IDS } from '@/helpers/constants';
import { Space } from '@/types';

type NullableSpace = Space | undefined | null;

export function useTreasury(spaceRef: Ref<NullableSpace>) {
  const treasury = computed(() => {
    const wallet = spaceRef.value?.treasuries?.[0];
    if (!wallet || !wallet.network || !wallet.address) return null;

    const chainId = CHAIN_IDS[wallet.network];
    if (!chainId || !wallet) return null;

    return {
      networkId: wallet.network,
      network: chainId,
      wallet: wallet.address
    };
  });

  return { treasury };
}
