import { getNetwork } from '@/networks';
import { ChainId, NetworkID } from '@/types';

export function getExecutionKey(chainId: ChainId | null, address: string) {
  return `${chainId}:${address.toLowerCase()}`;
}

export function getExecutionName(networkId: NetworkID, strategyType: string) {
  try {
    if (strategyType === 'ReadOnlyExecution') return 'Execution (read-only)';
    if (strategyType === 'oSnap') return 'oSnap execution';
    if (strategyType === 'safeSnap') return 'SafeSnap execution';

    const network = getNetwork(networkId);

    const name = network.constants.EXECUTORS[strategyType];
    if (name) return `${network.constants.EXECUTORS[strategyType]} execution`;

    return 'Custom execution';
  } catch {
    return null;
  }
}
