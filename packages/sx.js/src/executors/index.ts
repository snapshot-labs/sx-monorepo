import createAvatarExecutor from './avatar';
import createEthRelayerExecutor from './ethRelayer';
import createVanillaExecutor from './vanilla';
import { ExecutionInput, ExecutorType } from '../types';

export function getExecutionData(
  type: ExecutorType,
  executorAddress: string,
  input?: ExecutionInput
) {
  if (type === 'SimpleQuorumVanilla') {
    return createVanillaExecutor().getExecutionData(executorAddress);
  }

  if (
    ['SimpleQuorumAvatar', 'SimpleQuorumTimelock'].includes(type) &&
    input?.transactions
  ) {
    return createAvatarExecutor().getExecutionData(
      executorAddress,
      input.transactions
    );
  }

  if (type === 'EthRelayer' && input?.transactions && input.destination) {
    return createEthRelayerExecutor({
      destination: input.destination
    }).getExecutionData(executorAddress, input.transactions);
  }

  if (input?.transactions) {
    return createAvatarExecutor().getExecutionData(
      executorAddress,
      input.transactions
    );
  }

  throw new Error(
    `Not enough data to create execution for executor ${executorAddress}`
  );
}
