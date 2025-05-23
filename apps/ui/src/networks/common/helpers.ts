import {
  getExecutionData as _getExecutionData,
  Choice as SdkChoice
} from '@snapshot-labs/sx';
import { MetaTransaction } from '@snapshot-labs/sx/dist/utils/encoding/execution-hash';
import { getUrl } from '@/helpers/utils';
import {
  ConnectorType,
  NetworkHelpers,
  StrategyConfig
} from '@/networks/types';
import { Choice, Space } from '@/types';
import { EVM_CONNECTORS, STARKNET_CONNECTORS } from './constants';

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
  destinationAddress: string | null,
  transactions: MetaTransaction[]
) {
  const supportedExecutionIndex = space.executors.findIndex(
    executor => executor === executionStrategy
  );

  if (supportedExecutionIndex === -1) {
    throw new Error('No supported executor configured for this space');
  }

  const executorType = space.executors_types[
    supportedExecutionIndex
  ] as ExecutorType;
  return _getExecutionData(executorType, executionStrategy, {
    transactions,
    destination: destinationAddress || undefined
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

export async function buildMetadata(
  helpers: NetworkHelpers,
  config: StrategyConfig
) {
  if (!config.generateMetadata) return '';

  const metadata = await config.generateMetadata(config.params);
  const pinned = await helpers.pin(metadata);

  return `ipfs://${pinned.cid}`;
}

export function createStrategyPicker({
  helpers,
  managerConnectors,
  lowPriorityAuthenticators = []
}: {
  helpers: NetworkHelpers;
  managerConnectors: ConnectorType[];
  lowPriorityAuthenticators?: ('evm' | 'evm-tx' | 'starknet')[];
}) {
  return function pick({
    authenticators,
    strategies,
    strategiesIndicies,
    isContract,
    connectorType,
    ignoreRelayer
  }: {
    authenticators: string[];
    strategies: string[];
    strategiesIndicies: number[];
    isContract: boolean;
    connectorType: ConnectorType;
    ignoreRelayer?: boolean;
  }) {
    const authenticatorsInfo = [...authenticators]
      .filter(authenticator =>
        isContract
          ? helpers.isAuthenticatorContractSupported(authenticator)
          : helpers.isAuthenticatorSupported(authenticator)
      )
      .sort((a, b) => {
        const aRelayer = helpers.getRelayerAuthenticatorType(a);
        const bRelayer = helpers.getRelayerAuthenticatorType(b);
        const aLowPriority =
          aRelayer && lowPriorityAuthenticators.includes(aRelayer);
        const bLowPriority =
          bRelayer && lowPriorityAuthenticators.includes(bRelayer);

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
        const relayerType = helpers.getRelayerAuthenticatorType(authenticator);

        let connectors: ConnectorType[] = [];
        if (relayerType && ['evm', 'evm-tx'].includes(relayerType))
          connectors = EVM_CONNECTORS;
        else if (relayerType === 'starknet') connectors = STARKNET_CONNECTORS;
        else connectors = managerConnectors;

        return {
          authenticator,
          relayerType,
          connectors
        };
      })
      .filter(authenticator =>
        ignoreRelayer && authenticator.relayerType
          ? !['evm', 'starknet'].includes(authenticator.relayerType)
          : true
      );

    const authenticatorInfo = authenticatorsInfo.find(({ connectors }) =>
      connectors.includes(connectorType)
    );

    const selectedStrategies = strategies
      .map(
        (strategy, index) =>
          ({
            address: strategy,
            index: strategiesIndicies[index],
            paramsIndex: index
          }) as const
      )
      .filter(({ address }) => helpers.isStrategySupported(address));

    if (
      !authenticatorInfo ||
      (strategies.length !== 0 && selectedStrategies.length === 0)
    ) {
      throw new Error('Unsupported space');
    }

    return {
      relayerType: authenticatorInfo.relayerType,
      authenticator: authenticatorInfo.authenticator,
      strategies: selectedStrategies
    };
  };
}

export function awaitIndexedOnApi({
  txId,
  getLastIndexedBlockNumber,
  getTransactionBlockNumber,
  timeout
}: {
  txId: string;
  getLastIndexedBlockNumber: () => Promise<number | null>;
  getTransactionBlockNumber: (txId: string) => Promise<number | null>;
  timeout: number;
}): Promise<boolean> {
  let blockNumber: number | null = null;
  const interval = 2000;
  const maxRetries = Math.floor(timeout / interval);
  let retries = 0;

  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        if (!blockNumber) {
          blockNumber = await getTransactionBlockNumber(txId);
        }

        if (!blockNumber) {
          throw new Error('Invalid transaction block number');
        }

        const lastIndexedBlockNumber = await getLastIndexedBlockNumber();

        if (!lastIndexedBlockNumber) {
          throw new Error('Invalid indexer block number');
        }

        if (blockNumber <= lastIndexedBlockNumber) {
          clearInterval(timer);
          return resolve(true);
        } else if (retries > maxRetries) {
          clearInterval(timer);
          return reject(new Error('Transaction not indexed yet'));
        }

        throw new Error('Transaction not indexed yet');
      } catch {
        if (retries > maxRetries) {
          clearInterval(timer);
          return reject(false);
        }

        retries++;
        return;
      }
    }, interval);
  });
}
