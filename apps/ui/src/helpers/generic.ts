import { sanitizeUrl } from '@braintree/sanitize-url';
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getNetwork } from '@/networks';
import { METADATA as STARKNET_NETWORKS_METADATA } from '@/networks/starknet';
import { ChainId, NetworkID } from '@/types';
import { getProvider } from './provider';

function getStarknetNetworkId(chainId: ChainId): NetworkID {
  const network = Object.entries(STARKNET_NETWORKS_METADATA).find(
    ([, metadata]) => metadata.chainId === chainId
  );

  if (!network) throw new Error(`ChainId ${chainId} not found`);

  return network[0] as NetworkID;
}

export function getGenericExplorerUrl(
  chainId: ChainId,
  address: string,
  type: 'address' | 'token' | 'transaction'
) {
  const isEvmNetwork = typeof chainId === 'number';

  if (isEvmNetwork) {
    let mappedType = 'tx';
    if (type === 'address') {
      mappedType = 'address';
    } else if (type === 'token') {
      mappedType = 'token';
    }

    return `${networks[chainId].explorer.url}/${mappedType}/${address}`;
  }

  try {
    const networkId = getStarknetNetworkId(chainId);
    const network = getNetwork(networkId);
    const url = network.helpers.getExplorerUrl(address, type);

    return sanitizeUrl(url);
  } catch {
    return null;
  }
}

export function waitForTransaction(txId: string, chainId: ChainId) {
  const isEvmNetwork = typeof chainId === 'number';

  if (isEvmNetwork) {
    const provider = getProvider(chainId);
    return provider.waitForTransaction(txId);
  }

  const networkId = getStarknetNetworkId(chainId);
  return getNetwork(networkId).helpers.waitForTransaction(txId);
}
