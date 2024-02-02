import { getExecutionData as _getExecutionData, Choice as SdkChoice } from '@snapshot-labs/sx';
import { MetaTransaction } from '@snapshot-labs/sx/dist/utils/encoding/execution-hash';
import { EVM_CONNECTORS, STARKNET_CONNECTORS } from './constants';
import { getUrl } from '@/helpers/utils';
import { Connector, NetworkHelpers, StrategyConfig } from '@/networks/types';
import { Choice, Space } from '@/types';

type SpaceExecutionData = Pick<Space, 'executors' | 'executors_types'>;
type ExecutorType = Parameters<typeof _getExecutionData>[0];

export function getSdkChoice(choice: Choice): SdkChoice {
  if (choice === 'for') return SdkChoice.For;
  if (choice === 'against') return SdkChoice.Against;
  return SdkChoice.Abstain;
}

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

export async function parseStrategyMetadata(metadata: string | null) {
  if (metadata === null) return null;
  if (!metadata.startsWith('ipfs://')) return JSON.parse(metadata);

  const strategyUrl = getUrl(metadata);
  if (!strategyUrl) return null;

  const res = await fetch(strategyUrl);
  return res.json();
}

export async function buildMetadata(helpers: NetworkHelpers, config: StrategyConfig) {
  if (!config.generateMetadata) return '';

  const metadata = await config.generateMetadata(config.params);
  const pinned = await helpers.pin(metadata);

  return `ipfs://${pinned.cid}`;
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
    strategiesIndicies,
    isContract,
    connectorType
  }: {
    authenticators: string[];
    strategies: string[];
    strategiesIndicies: number[];
    isContract: boolean;
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
      .map((strategy, index) => ({ address: strategy, index: strategiesIndicies[index] }) as const)
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
