import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

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
