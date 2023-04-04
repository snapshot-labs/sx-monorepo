import { Space } from '@/types';

type NullableSpace = Space | undefined | null;

export function useTreasury(spaceRef?: Space | Ref<NullableSpace> | ComputedRef<NullableSpace>) {
  const treasury = computed(() => {
    if (!spaceRef) return;

    const space = 'value' in spaceRef ? spaceRef.value : spaceRef;
    if (!space || !space.wallet) return null;

    const [networkId, wallet] = space.wallet.split(':');

    if (networkId !== 'gor' || !wallet) return null;

    return {
      network: 5,
      wallet
    };
  });

  return { treasury };
}
