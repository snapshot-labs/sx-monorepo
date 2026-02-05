import { evm } from '@snapshot-labs/checkpoint';
import { evmNetworks } from '@snapshot-labs/sx';
import { PublicClient } from 'viem';
import { EVMConfig, NetworkID, PartialConfig } from './types';

type ProtocolConfig = Pick<EVMConfig, 'sources' | 'templates' | 'abis'>;

type SourceOrTemplate = {
  events: NonNullable<EVMConfig['sources']>[number]['events'];
};

export const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

function applyProtocolPrefixToEvents<T extends SourceOrTemplate>(
  prefix: string,
  source: T
) {
  return {
    ...source,
    events: source.events.map(event => ({
      ...event,
      fn: `${prefix}_${event.fn}`
    }))
  };
}

function applyProtocolPrefixToSources(
  prefix: string,
  sources: NonNullable<EVMConfig['sources']>
) {
  return sources.map(source => applyProtocolPrefixToEvents(prefix, source));
}

function applyProtocolPrefixToTemplates(
  prefix: string,
  templates: EVMConfig['templates']
) {
  if (!templates) return {};

  return Object.fromEntries(
    Object.entries(templates).map(([key, template]) => [
      key,
      applyProtocolPrefixToEvents(prefix, template)
    ])
  );
}

export function applyProtocolPrefixToWriters(
  prefix: string,
  writers: Record<string, evm.Writer>
) {
  return Object.fromEntries(
    Object.entries(writers).map(([key, writer]) => [`${prefix}_${key}`, writer])
  );
}

export function applyConfig(
  target: PartialConfig,
  prefix: string,
  config: ProtocolConfig
): PartialConfig {
  return {
    sources: [
      ...(target.sources ?? []),
      ...applyProtocolPrefixToSources(prefix, config.sources ?? [])
    ],
    templates: {
      ...target.templates,
      ...applyProtocolPrefixToTemplates(prefix, config.templates ?? {})
    },
    abis: { ...target.abis, ...config.abis }
  };
}

export async function getTimestampFromBlock({
  networkId,
  blockNumber,
  currentBlockNumber,
  currentTimestamp,
  client
}: {
  networkId: NetworkID;
  blockNumber: number;
  currentBlockNumber: number;
  currentTimestamp: number;
  client: PublicClient;
}) {
  const baseNetwork = evmNetworks[networkId];

  let actualCurrentBlockNumber = BigInt(currentBlockNumber);
  if (baseNetwork.Meta.hasNonNativeBlockNumbers) {
    actualCurrentBlockNumber = await client.readContract({
      address: MULTICALL3_ADDRESS,
      abi: [
        {
          inputs: [],
          name: 'getBlockNumber',
          outputs: [
            {
              internalType: 'uint256',
              name: 'blockNumber',
              type: 'uint256'
            }
          ],
          stateMutability: 'view',
          type: 'function'
        }
      ],
      functionName: 'getBlockNumber',
      blockNumber: BigInt(currentBlockNumber)
    });
  }

  const blockDifference = blockNumber - Number(actualCurrentBlockNumber);

  return Math.round(
    currentTimestamp + blockDifference * evmNetworks[networkId].Meta.blockTime
  );
}
