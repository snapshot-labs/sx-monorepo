import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

export function getExecutionName(networkId: NetworkID, strategyType: string) {
  try {
    if (strategyType === 'ReadOnlyExecution') return 'Execution (read-only)';
    if (strategyType === 'oSnap') return 'oSnap execution';

    const network = getNetwork(networkId);
    return `${network.constants.EXECUTORS[strategyType]} execution`;
  } catch (e) {
    return null;
  }
}
