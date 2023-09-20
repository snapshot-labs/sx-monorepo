import { Space } from '@/types';

type NullableSpace = Space | undefined | null;

const chainIds = {
  matic: 137,
  arb1: 42161,
  gor: 5,
  sep: 11155111,
  'linea-testnet': 59140
};

export function useTreasury(spaceRef: Ref<NullableSpace>) {
  const treasury = computed(() => {
    if (!spaceRef.value || !spaceRef.value.wallet) return null;

    const [networkId, wallet] = spaceRef.value.wallet.split(':');
    const chainId = chainIds[networkId];
    if (!chainId || !wallet) return null;

    return {
      networkId,
      network: chainId,
      wallet
    };
  });

  return { treasury };
}
