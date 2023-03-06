import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { createApi } from '../common/graphqlApi';
import { createActions } from './actions';
import { createProvider } from './provider';
import * as constants from './constants';
import { pinGraph } from '@/helpers/graph';
import type { Network } from '@/networks/types';
import type { NetworkID } from '@/types';

export function createEvmNetwork(networkId: NetworkID): Network {
  const chainId = 5;

  const provider = createProvider(`https://rpc.brovider.xyz/${chainId}`);

  return {
    name: 'Ethereum (goerli)',
    hasReceive: false,
    managerConnectors: ['injected', 'walletconnect', 'walletlink', 'portis', 'gnosis'],
    actions: createActions(chainId),
    api: createApi(constants.API_URL, networkId),
    constants,
    helpers: {
      pin: pinGraph,
      waitForTransaction: (txId: string) => provider.waitForTransaction(txId),
      getExplorerUrl: (id, type) => {
        let dataType: 'tx' | 'address' = 'tx';
        if (['address', 'contract'].includes(type)) dataType = 'address';

        return `${networks[chainId].explorer}/${dataType}/${id}`;
      }
    }
  };
}
