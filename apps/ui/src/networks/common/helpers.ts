import {
  getExecutionData as _getExecutionData,
  Choice as SdkChoice,
  utils
} from '@snapshot-labs/sx';
import { getUrl } from '@/helpers/utils';
import {
  AuthenticatorSupportInfo,
  ConnectorType,
  NetworkHelpers,
  StrategyConfig
} from '@/networks/types';
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
  destinationAddress: string | null,
  transactions: utils.encoding.MetaTransaction[]
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

export function createStrategyPicker({ helpers }: { helpers: NetworkHelpers }) {
  return function pick({
    authenticators,
    strategies,
    strategiesIndices,
    isContract,
    hasReason,
    connectorType,
    ignoreRelayer
  }: {
    authenticators: string[];
    strategies: string[];
    strategiesIndices: number[];
    isContract: boolean;
    hasReason: boolean;
    connectorType: ConnectorType;
    ignoreRelayer?: boolean;
  }) {
    type AuthenticatorWithSupportInfo = {
      authenticator: string;
      supportInfo: AuthenticatorSupportInfo;
    };

    const hasSupportInfo = (entry: {
      supportInfo: AuthenticatorSupportInfo | null;
    }): entry is AuthenticatorWithSupportInfo => {
      if (!entry.supportInfo) return false;
      return true;
    };

    const authenticatorsInfo = [...authenticators]
      .map(authenticator => ({
        authenticator,
        supportInfo: helpers.getAuthenticatorSupportInfo(authenticator)
      }))
      .filter(hasSupportInfo)
      .filter(({ supportInfo }) => {
        if (isContract && !supportInfo.isContractSupported) return false;
        if (ignoreRelayer && supportInfo.relayerType) return false;
        if (hasReason && !supportInfo.isReasonSupported) return false;

        return supportInfo.isSupported;
      })
      .sort((a, b) => {
        const aRelayerPriority = a.supportInfo.priority ?? 0;
        const bRelayerPriority = b.supportInfo.priority ?? 0;

        return aRelayerPriority - bRelayerPriority;
      })
      .map(({ authenticator, supportInfo }) => ({
        authenticator,
        relayerType: supportInfo.relayerType,
        connectors: supportInfo.connectors
      }));

    const authenticatorInfo = authenticatorsInfo.find(({ connectors }) =>
      connectors.includes(connectorType)
    );

    const selectedStrategies = strategies
      .map(
        (strategy, index) =>
          ({
            address: strategy,
            index: strategiesIndices[index],
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
    const checkTransaction = async () => {
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
          return resolve(true);
        }

        if (retries > maxRetries) {
          return reject(new Error('Transaction not indexed yet'));
        }

        throw new Error('Transaction not indexed yet');
      } catch {
        if (retries > maxRetries) {
          return reject(new Error('Timeout waiting for indexing'));
        }

        retries++;
        setTimeout(checkTransaction, interval);
      }
    };

    setTimeout(checkTransaction, interval);
  });
}
