import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { ChainId } from '@/types';
import { getProvider } from './provider';

export function getGenericExplorerUrl(
  chainId: ChainId,
  address: string,
  type: 'address' | 'token' | 'transaction'
) {
  let mappedType = 'tx';
  if (type === 'address') mappedType = 'address';
  else if (type === 'token') mappedType = 'token';

  if (!networks[chainId]) return null;

  return `${networks[chainId].explorer.url}/${mappedType}/${address}`;
}

export async function waitForTransaction(txId: string, chainId: ChainId) {
  const provider = getProvider(Number(chainId));
  return provider.waitForTransaction(txId);
}
