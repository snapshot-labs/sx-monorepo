import { Space } from '@/types';

type NullableSpace = Space | undefined | null;

export function useTreasury(spaceRef: Ref<NullableSpace>) {
  const treasury = computed(() => {
    if (!spaceRef.value || !spaceRef.value.wallet) return null;

    const [networkId, wallet] = spaceRef.value.wallet.split(':');
    if (networkId !== 'gor' || !wallet) return null;

    return {
      network: 5,
      wallet
    };
  });

  return { treasury };
}
