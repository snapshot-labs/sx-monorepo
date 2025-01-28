import { METADATA } from '@/networks/starknet';
import { ChainId, NetworkID } from '@/types';

export function getDelegationNetwork(chainId: ChainId) {
  // TODO: check if eth is actually what we want here, probably should be matching chainId is isEvmNetwork
  // https://github.com/snapshot-labs/sx-monorepo/pull/946

  const isEvmNetwork = typeof chainId === 'number';
  const actionNetwork = isEvmNetwork
    ? 'eth'
    : (Object.entries(METADATA).find(
        ([, metadata]) => metadata.chainId === chainId
      )?.[0] as NetworkID);
  if (!actionNetwork) throw new Error('Failed to detect action network');

  return actionNetwork;
}
