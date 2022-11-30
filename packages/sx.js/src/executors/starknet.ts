import { createStarknetExecutionParams } from '../utils/encoding/starknet-execution-params';
import type { Call } from 'starknet';

export const starknetExecutor = {
  type: 'starknet',
  getExecutionData(executorAddress: string, calls: Call[]) {
    return {
      executor: executorAddress,
      executionParams: createStarknetExecutionParams(calls)
    };
  }
};
