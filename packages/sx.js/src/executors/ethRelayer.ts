import { AbiCoder } from '@ethersproject/abi';
import { keccak256 } from '@ethersproject/keccak256';
import { MetaTransaction } from '../utils/encoding';
import { uint256 } from 'starknet';

export default function createEthRelayerExecutor({ destination }: { destination: string }) {
  return {
    type: 'ethRelayer',
    getExecutionData(executorAddress: string, transactions: MetaTransaction[]) {
      const abiCoder = new AbiCoder();

      const executionParams = abiCoder.encode(
        ['tuple(address to, uint256 value, bytes data, uint8 operation)[]'],
        [transactions]
      );

      const executionHash = uint256.bnToUint256(BigInt(keccak256(executionParams)));

      return {
        executor: executorAddress,
        executionParams: [
          destination,
          `0x${executionHash.low.toString(16).replace('0x', '')}`,
          `0x${executionHash.high.toString(16).replace('0x', '')}`
        ]
      };
    }
  };
}
