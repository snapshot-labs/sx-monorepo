import createStarknetExecutor from './starknet';
import createVanillaExecutor from './vanilla';
import createEthRelayerExecutor from './ethRelayer';
import createAvatarExecutor from './avatar';
import type { EvmNetworkConfig, NetworkConfig, ExecutionInput } from '../types';

export function getExecutionData(
  executorAddress: string,
  networkConfig: NetworkConfig | EvmNetworkConfig,
  input?: ExecutionInput
) {
  const executor = networkConfig.executors[executorAddress];
  if (!executor) throw new Error(`Unknown executor ${executorAddress}`);

  if (executor.type === 'starknet' && input?.calls) {
    return createStarknetExecutor().getExecutionData(executorAddress, input?.calls);
  }

  if (executor.type === 'ethRelayer' && input?.transactions) {
    return createEthRelayerExecutor(executor.params).getExecutionData(
      executorAddress,
      input.transactions
    );
  }

  if (executor.type === 'vanilla') {
    return createVanillaExecutor().getExecutionData(executorAddress);
  }

  if (executor.type === 'avatar' && input?.transactions) {
    return createAvatarExecutor().getExecutionData(executorAddress, input.transactions);
  }

  throw new Error(`Not enough data to create execution for executor ${executorAddress}`);
}
