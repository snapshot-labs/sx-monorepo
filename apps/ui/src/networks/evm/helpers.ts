import { getEvmExecutionData } from '@snapshot-labs/sx';
import {
  RELAYER_AUTHENTICATORS,
  SUPPORTED_AUTHENTICATORS,
  SUPPORTED_STRATEGIES
} from './constants';
import type { MetaTransaction } from '@snapshot-labs/sx/dist/utils/encoding/execution-hash';
import type { Space } from '@/types';

type SpaceExecutionData = Pick<Space, 'executors' | 'executors_types'>;
type ExecutorType = Parameters<typeof getEvmExecutionData>[0];

export function getExecutionData(
  space: SpaceExecutionData,
  executionStrategy: string,
  transactions: MetaTransaction[]
) {
  const supportedExecutionIndex = space.executors.findIndex(
    executor => executor === executionStrategy
  );

  if (supportedExecutionIndex === -1) {
    throw new Error('No supported executor configured for this space');
  }

  const executorType = space.executors_types[supportedExecutionIndex] as ExecutorType;
  return getEvmExecutionData(executorType, executionStrategy, {
    transactions
  });
}

export function pickAuthenticatorAndStrategies(
  authenticators: string[],
  strategies: string[],
  isContract = false
) {
  const supportedAuthenticators = authenticators.filter(
    authenticator => SUPPORTED_AUTHENTICATORS[authenticator]
  );

  const authenticator = isContract
    ? supportedAuthenticators.find(authenticator => !RELAYER_AUTHENTICATORS[authenticator])
    : supportedAuthenticators.find(authenticator => RELAYER_AUTHENTICATORS[authenticator]) ||
      supportedAuthenticators[0];

  const selectedStrategies = strategies
    .map((strategy, index) => ({ address: strategy, index } as const))
    .filter(({ address }) => SUPPORTED_STRATEGIES[address]);

  if (!authenticator || (strategies.length !== 0 && selectedStrategies.length === 0)) {
    throw new Error('Unsupported space');
  }

  return {
    useRelayer: !!RELAYER_AUTHENTICATORS[authenticator],
    authenticator,
    strategies: selectedStrategies
  };
}

export async function executionCall(
  baseUrl: string,
  chainId: number,
  method: 'execute' | 'executeQueuedProposal',
  params: any
) {
  const res = await fetch(`${baseUrl}/eth_rpc/${chainId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: method,
      params,
      id: null
    })
  });

  const { error, result } = await res.json();
  if (error) throw new Error('Finalization failed');

  return result;
}
