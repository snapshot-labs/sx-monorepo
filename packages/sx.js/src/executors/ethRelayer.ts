import { createExecutionHash, MetaTransaction } from '../utils/encoding/execution-hash';
import { SplitUint256 } from '../utils/split-uint256';
import { EthRelayerExecutionConfig } from '../types';

export default function createEthRelayerExecutor(params: EthRelayerExecutionConfig['params']) {
  const { destination, chainId } = params;

  return {
    type: 'ethRelayer',
    getExecutionData(executorAddress: string, transactions: MetaTransaction[]) {
      const { executionHash } = createExecutionHash(transactions, destination, chainId);
      const executionHashSplit = SplitUint256.fromHex(executionHash);

      return {
        executor: executorAddress,
        executionParams: [destination, executionHashSplit.low, executionHashSplit.high]
      };
    }
  };
}
