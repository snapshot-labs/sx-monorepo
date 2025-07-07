import { getProvider } from '@/helpers/provider';
import { METADATA as STARKNET_METADATA } from '@/networks/starknet';
import { Choice } from '@/types';
import { EDITOR_SNAPSHOT_OFFSET } from './constants';

const STARKNET_CHAIN_IDS: string[] = Object.values(STARKNET_METADATA).map(
  metadata => metadata.chainId
);

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

export function isStarknetChainId(chainId: string): boolean {
  return STARKNET_CHAIN_IDS.includes(chainId);
}

export async function getLatestBlockNumber(chainId: string): Promise<number> {
  // TODO: remove this check after implementing starknet support on getProvider
  if (isStarknetChainId(chainId)) {
    throw new Error(
      'Proposal creation not supported for spaces on Starknet network'
    );
  }

  const provider = getProvider(Number(chainId));

  return (await provider.getBlockNumber()) - EDITOR_SNAPSHOT_OFFSET;
}
