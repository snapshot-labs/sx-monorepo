import { createExecutionHash, MetaTransaction } from '../utils/encoding/execution-hash';
import { SplitUint256 } from '../utils/split-uint256';

const CONSTANTS = {
  '0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81': {
    destination: '0xa88f72e92cc519d617b684F8A78d3532E7bb61ca',
    chainId: 5
  }
};

export const ethRelayerExecutor = {
  type: 'ethRelayer',
  getExecutionData(executorAddress: keyof typeof CONSTANTS, transactions: MetaTransaction[]) {
    const { destination, chainId } = CONSTANTS[executorAddress];

    const { executionHash } = createExecutionHash(transactions, destination, chainId);
    const executionHashSplit = SplitUint256.fromHex(executionHash);

    return {
      executor: executorAddress,
      executionParams: [destination, executionHashSplit.low, executionHashSplit.high]
    };
  }
};
