import { Account, RpcProvider, constants } from 'starknet';
import { clients, starknetMainnet, starknetGoerli, starknetSepolia } from '@snapshot-labs/sx';
import { getProvider, createAccountProxy } from './dependencies';
import { NonceManager } from './nonce-manager';

export const NETWORKS = {
  [constants.StarknetChainId.SN_MAIN]: starknetMainnet,
  [constants.StarknetChainId.SN_GOERLI]: starknetGoerli,
  [constants.StarknetChainId.SN_SEPOLIA]: starknetSepolia
} as const;

const clientsMap = new Map<
  string,
  {
    provider: RpcProvider;
    client: clients.StarknetTx;
    getAccount: (spaceAddress) => { account: Account; nonceManager: NonceManager };
  }
>();

export function getClient(chainId: string) {
  const cached = clientsMap.get(chainId);
  if (cached) return cached;

  const provider = getProvider(chainId);
  const getAccount = createAccountProxy(process.env.STARKNET_MNEMONIC || '', provider);

  const client = new clients.StarknetTx({
    starkProvider: provider,
    ethUrl: process.env.ETH_RPC_URL as string,
    networkConfig: NETWORKS[chainId]
  });

  clientsMap.set(chainId, { provider, client, getAccount });

  return { provider, client, getAccount };
}
