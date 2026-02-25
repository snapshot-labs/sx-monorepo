import { sanitizeUrl } from '@braintree/sanitize-url';
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getNetwork } from '@/networks';
import { METADATA as EVM_NETWORKS_METADATA } from '@/networks/evm';
import { METADATA as STARKNET_NETWORKS_METADATA } from '@/networks/starknet';
import { ChainId, NetworkID } from '@/types';
import { getProvider } from './provider';
import { getChainIdKind } from './utils';

function getStarknetNetworkId(chainId: ChainId): NetworkID {
  const network = Object.entries(STARKNET_NETWORKS_METADATA).find(
    ([, metadata]) => metadata.chainId === chainId
  );

  if (!network) throw new Error(`ChainId ${chainId} not found`);

  return network[0] as NetworkID;
}

function getEvmNetworkId(chainId: ChainId): NetworkID {
  const network = Object.entries(EVM_NETWORKS_METADATA).find(
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
  const isEvmNetwork = getChainIdKind(chainId) === 'evm';

  if (isEvmNetwork) {
    let mappedType = 'tx';
    if (type === 'address') {
      mappedType = 'address';
    } else if (type === 'token') {
      mappedType = 'token';
    }

    if (!networks[chainId]) return null;

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

export async function waitForTransaction(
  txId: string,
  chainId: ChainId,
  waitForIndexing = false
) {
  const isEvmNetwork = getChainIdKind(chainId) === 'evm';
  let networkId: NetworkID;

  if (isEvmNetwork) {
    try {
      networkId = getEvmNetworkId(chainId);
    } catch {
      const provider = getProvider(Number(chainId));
      return provider.waitForTransaction(txId);
    }
  } else {
    networkId = getStarknetNetworkId(chainId);
  }

  const network = getNetwork(networkId);
  const tx = await network.helpers.waitForTransaction(txId);

  if (waitForIndexing) {
    try {
      await network.helpers.waitForIndexing(txId);
    } catch (e) {
      console.error('Timeout while waiting for API indexing', e);
    }
  }

  return tx;
}
