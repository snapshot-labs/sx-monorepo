import createAvatarExecutor from './avatar';
import createEthRelayerExecutor from './ethRelayer';
import createVanillaExecutor from './vanilla';
import { ExecutionInput, ExecutorType } from '../types';

export function getExecutionData(
  type: ExecutorType,
  executorAddress: string,
  input?: ExecutionInput
) {
  // SimpleQuorumVanilla ignores the payload onchain, but when a transactions
  // array is provided (even an empty one) it is still avatar-encoded so the
  // execution hash binds it. Only omitting transactions entirely yields the
  // empty vanilla payload.
  if (type === 'SimpleQuorumVanilla' && !input?.transactions) {
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
