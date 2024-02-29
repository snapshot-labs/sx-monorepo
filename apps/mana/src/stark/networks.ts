import { Account, RpcProvider, constants } from 'starknet';
import {
  clients,
  starknetMainnet,
  starknetGoerli,
  starknetSepolia,
  NetworkConfig
} from '@snapshot-labs/sx';
import { ETH_NODE_URLS, getProvider, createAccountProxy } from './dependencies';
import { NonceManager } from './nonce-manager';

export const NETWORKS = new Map<string, NetworkConfig>([
  [constants.StarknetChainId.SN_MAIN, starknetMainnet],
  [constants.StarknetChainId.SN_GOERLI, starknetGoerli],
  [constants.StarknetChainId.SN_SEPOLIA, starknetSepolia]
]);

const clientsMap = new Map<
  string,
  {
    provider: RpcProvider;
    client: clients.StarknetTx;
    getAccount: (spaceAddress: string) => { account: Account; nonceManager: NonceManager };
  }
>();

export function getClient(chainId: string) {
  const cached = clientsMap.get(chainId);
  if (cached) return cached;

  const provider = getProvider(chainId);
  const getAccount = createAccountProxy(process.env.STARKNET_MNEMONIC || '', provider);

  const ethUrl = ETH_NODE_URLS.get(chainId);
  if (!ethUrl) throw new Error(`Missing ethereum node url for chainId ${chainId}`);

  const client = new clients.StarknetTx({
    starkProvider: provider,
    ethUrl,
    networkConfig: NETWORKS.get(chainId)
  });

  clientsMap.set(chainId, { provider, client, getAccount });

  return { provider, client, getAccount };
}
