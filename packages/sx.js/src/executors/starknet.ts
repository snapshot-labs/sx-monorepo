import { createStarknetExecutionParams } from '../utils/encoding/starknet-execution-params';
import type { Call } from 'starknet';

export default function createStarknetExecutor() {
  return {
    type: 'starknet',
    getExecutionData(executorAddress: string, calls: Call[]) {
      return {
        executor: executorAddress,
        executionParams: createStarknetExecutionParams(calls)
      };
    }
  };
}
