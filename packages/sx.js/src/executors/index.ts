import type { ExecutionInput } from '../types';
import { ethRelayerExecutor } from './ethRelayer';
import { starknetExecutor } from './starknet';
import { vanillaExecutor } from './vanilla';

type Executor = {
  type: string;
  getExecutionData(
    executorAddress: string,
    data?: any
  ): {
    executor: string;
    executionParams: string[];
  };
};

const executors: { [key: string]: Executor } = {
  '1': starknetExecutor,
  '0x4ecc83848a519cc22b0d0ffb70e65ec8dde85d3d13439eff7145d4063cf6b4d': vanillaExecutor,
  '0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81': ethRelayerExecutor
};

export function getExecutionData(executorAddress: string, input?: ExecutionInput) {
  const executor = executors[executorAddress];
  if (!executor) throw new Error(`Unknown executor ${executorAddress}`);

  if (executor === starknetExecutor && input?.calls) {
    return executor.getExecutionData(executorAddress, input.calls);
  } else if (executor === ethRelayerExecutor && input?.transactions) {
    return executor.getExecutionData(executorAddress, input.transactions);
  } else if (executor === vanillaExecutor) {
    return executor.getExecutionData(executorAddress);
  }

  throw new Error(`Not enough data to create execution for executor ${executorAddress}`);
}

export { ethRelayerExecutor, starknetExecutor, vanillaExecutor };
