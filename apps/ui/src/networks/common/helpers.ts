import { getExecutionData as _getExecutionData } from '@snapshot-labs/sx';
import { MetaTransaction } from '@snapshot-labs/sx/dist/utils/encoding/execution-hash';
import { Connector } from '@/networks/types';
import { Space } from '@/types';
import { EVM_CONNECTORS, STARKNET_CONNECTORS } from './constants';

type SpaceExecutionData = Pick<Space, 'executors' | 'executors_types'>;
type ExecutorType = Parameters<typeof _getExecutionData>[0];

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
  return _getExecutionData(executorType, executionStrategy, {
    transactions
  });
}

export function createStrategyPicker({
  supportedAuthenticators,
  supportedStrategies,
  contractSupportedAuthenticators,
  relayerAuthenticators,
  managerConnectors,
  lowPriorityAuthenticators = []
}: {
  supportedAuthenticators: Record<string, boolean | undefined>;
  supportedStrategies: Record<string, boolean | undefined>;
  contractSupportedAuthenticators: Record<string, boolean | undefined>;
  relayerAuthenticators: Record<string, 'evm' | 'evm-tx' | 'starknet' | undefined>;
  managerConnectors: Connector[];
  lowPriorityAuthenticators?: ('evm' | 'evm-tx' | 'starknet')[];
}) {
  return function pick({
    authenticators,
    strategies,
    isContract = false,
    connectorType
  }: {
    authenticators: string[];
    strategies: string[];
    isContract?: boolean;
    connectorType: Connector;
  }) {
    const authenticatorsInfo = [...authenticators]
      .filter(authenticator =>
        isContract
          ? contractSupportedAuthenticators[authenticator]
          : supportedAuthenticators[authenticator]
      )
      .sort((a, b) => {
        const aRelayer = relayerAuthenticators[a];
        const bRelayer = relayerAuthenticators[b];
        const aLowPriority = aRelayer && lowPriorityAuthenticators.includes(aRelayer);
        const bLowPriority = bRelayer && lowPriorityAuthenticators.includes(bRelayer);

        if (aLowPriority && !bLowPriority) {
          return 1;
        }

        if (!aLowPriority && bLowPriority) {
          return -1;
        }

        if (aRelayer && bRelayer) {
          return 0;
        }

        if (aRelayer) {
          return -1;
        }

        if (bRelayer) {
          return 1;
        }

        return 0;
      })
      .map(authenticator => {
        const relayerType = relayerAuthenticators[authenticator];

        let connectors: Connector[] = [];
        if (relayerType && ['evm', 'evm-tx'].includes(relayerType)) connectors = EVM_CONNECTORS;
        else if (relayerType === 'starknet') connectors = STARKNET_CONNECTORS;
        else connectors = managerConnectors;

        return {
          authenticator,
          relayerType,
          connectors
        };
      });

    const authenticatorInfo = authenticatorsInfo.find(({ connectors }) =>
      connectors.includes(connectorType)
    );

    const selectedStrategies = strategies
      .map((strategy, index) => ({ address: strategy, index }) as const)
      .filter(({ address }) => supportedStrategies[address]);

    if (!authenticatorInfo || (strategies.length !== 0 && selectedStrategies.length === 0)) {
      throw new Error('Unsupported space');
    }

    return {
      relayerType: authenticatorInfo.relayerType,
      authenticator: authenticatorInfo.authenticator,
      strategies: selectedStrategies
    };
  };
}
