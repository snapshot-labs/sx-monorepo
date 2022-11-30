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
  '0x70d94f64cfab000f8e26318f4413dfdaa1f19a3695e3222297edc62bbc936c7': vanillaExecutor,
  '0x790a2f60ac5a1743ebfad2a00b06d1c40866dc92eead76a7ede6c805bc29a4b': ethRelayerExecutor
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
