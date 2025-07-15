import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { RpcProvider } from 'starknet';
import { getProvider } from '@/helpers/provider';
import { METADATA as STARKNET_METADATA } from '@/networks/starknet';
import { ChainId, Choice, NetworkID } from '@/types';
import { EDITOR_SNAPSHOT_OFFSET } from './constants';
import { createProvider } from '../starknet/provider';

const STARKNET_CHAIN_ID_TO_NETWORK_MAPPING: Record<ChainId, NetworkID> =
  Object.fromEntries(
    Object.entries(STARKNET_METADATA).map(([network, metadata]) => [
      metadata.chainId as ChainId,
      network as NetworkID
    ])
  );

function getStarknetMetadata(chainId: string) {
  return STARKNET_METADATA[
    STARKNET_CHAIN_ID_TO_NETWORK_MAPPING[chainId as ChainId]
  ];
}

export function isStarknetChainId(chainId: string): boolean {
  return !!STARKNET_CHAIN_ID_TO_NETWORK_MAPPING[chainId as ChainId];
}

export async function getLatestBlockNumber(chainId: string): Promise<number> {
  try {
    let provider: StaticJsonRpcProvider | RpcProvider;

    if (isStarknetChainId(chainId)) {
      const starknetMetadata = getStarknetMetadata(chainId);
      if (!starknetMetadata) {
        throw new Error(`Error creating provider for chain ID: ${chainId}`);
      }
      provider = createProvider(starknetMetadata.rpcUrl);
    } else {
      provider = getProvider(Number(chainId));
    }

    const blockNumber = await provider.getBlockNumber();

    return Math.max(0, blockNumber - EDITOR_SNAPSHOT_OFFSET);
  } catch (error) {
    throw new Error(
      `Failed to get latest block number for chain ${chainId}: ${error}`
    );
  }
}

export function getSdkChoice(
  type: string,
  choice: Choice
): number | number[] | Record<string, number> {
  if (type === 'basic') {
    if (choice === 'for') return 1;
    if (choice === 'against') return 2;
    return 3;
  }

  if (type === 'single-choice') {
    return choice as number;
  }

  if (type === 'approval' || type === 'ranked-choice' || type === 'copeland') {
    return choice as number[];
  }

  if (['weighted', 'quadratic'].includes(type)) {
    return choice as Record<string, number>;
  }

  throw new Error('Vote type not supported');
}
