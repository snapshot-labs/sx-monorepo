import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { formatAddress } from '@/helpers/utils';
import { NetworkID } from '@/types';
import { METADATA as EVM_METADATA } from './evm/metadata';

type ExplorerType =
  | 'transaction'
  | 'address'
  | 'contract'
  | 'strategy'
  | 'token';

type AuctionNetworkInfo = {
  id: NetworkID;
  name: string;
  chainId: number;
  currentChainId: number;
  avatar: string;
  helpers: {
    getExplorerUrl(id: string, type: ExplorerType): string;
  };
};

export const enabledNetworks: NetworkID[] = ['eth', 'base', 'sep'];

function buildNetwork(id: NetworkID): AuctionNetworkInfo {
  const metadata = EVM_METADATA[id];
  if (!metadata) throw new Error(`Network ${id} is not enabled`);

  const { chainId } = metadata;

  return {
    id,
    name: metadata.name,
    chainId,
    currentChainId: metadata.currentChainId ?? chainId,
    avatar: metadata.avatar,
    helpers: {
      getExplorerUrl(id, type) {
        let dataType: 'tx' | 'address' | 'token' = 'tx';
        if (type === 'token') dataType = 'token';
        else if (['address', 'contract', 'strategy'].includes(type))
          dataType = 'address';

        if (dataType === 'address') id = formatAddress(id);

        return `${networks[chainId].explorer.url}/${dataType}/${id}`;
      }
    }
  };
}

export const getNetwork = (id: NetworkID) => {
  if (!enabledNetworks.includes(id))
    throw new Error(`Network ${id} is not enabled`);
  return buildNetwork(id);
};
