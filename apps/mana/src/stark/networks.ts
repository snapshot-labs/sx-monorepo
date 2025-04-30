import {
  clients,
  NetworkConfig,
  starknetMainnet,
  starknetNetworks,
  starknetSepolia
} from '@snapshot-labs/sx';
import { Account, constants, RpcProvider } from 'starknet';
import { createAccountProxy, ETH_NODE_URLS, getProvider } from './dependencies';
import { NonceManager } from './nonce-manager';

export const NETWORKS = new Map<string, NetworkConfig>([
  [constants.StarknetChainId.SN_MAIN, starknetMainnet],
  [constants.StarknetChainId.SN_SEPOLIA, starknetSepolia]
]);

export const NETWORK_IDS = new Map<string, string>(
  Object.entries(starknetNetworks).map(([networkId, config]) => [
    config.Meta.eip712ChainId,
    networkId
  ])
);

const clientsMap = new Map<
  string,
  {
    provider: RpcProvider;
    client: clients.StarknetTx;
    herodotusController: clients.HerodotusController;
    getAccount: (spaceAddress: string) => {
      account: Account;
      nonceManager: NonceManager;
      deployAccount: () => Promise<void>;
    };
  }
>();

export function getClient(chainId: string) {
  const cached = clientsMap.get(chainId);
  if (cached) return cached;

  const provider = getProvider(chainId);
  const getAccount = createAccountProxy(chainId, provider);

  const ethUrl = ETH_NODE_URLS.get(chainId);
  if (!ethUrl)
    throw new Error(`Missing ethereum node url for chainId ${chainId}`);

  const networkConfig = NETWORKS.get(chainId);
  if (!networkConfig)
    throw new Error(`Missing network config for chainId ${chainId}`);

  const client = new clients.StarknetTx({
    starkProvider: provider,
    ethUrl,
    networkConfig,
    whitelistServerUrl: 'https://wls.snapshot.box'
  });

  const herodotusController = new clients.HerodotusController(networkConfig);

  clientsMap.set(chainId, {
    provider,
    client,
    herodotusController,
    getAccount
  });

  return { provider, client, herodotusController, getAccount };
}
