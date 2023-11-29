import { Account, constants, RpcProvider } from 'starknet';
import { clients, starknetMainnet, starknetGoerli1 } from '@snapshot-labs/sx';

export const NETWORKS = {
  [constants.StarknetChainId.SN_MAIN]: starknetMainnet,
  [constants.StarknetChainId.SN_GOERLI]: starknetGoerli1
} as const;

const clientsMap = new Map<
  string,
  {
    provider: RpcProvider;
    client: clients.StarkNetTx;
    account: Account;
  }
>();

function getProvider(chainId: string) {
  const networkName = chainId === constants.StarknetChainId.SN_MAIN ? 'SN_MAIN' : 'SN_GOERLI';

  return new RpcProvider({
    nodeUrl: networkName
  });
}

export function getClient(chainId: string) {
  const cached = clientsMap.get(chainId);
  if (cached) return cached;

  const provider = getProvider(chainId);

  const client = new clients.StarkNetTx({
    starkProvider: provider,
    ethUrl: process.env.ETH_RPC_URL as string,
    networkConfig: NETWORKS[chainId]
  });

  const account = new Account(
    provider,
    process.env.STARKNET_ADDRESS || '',
    process.env.STARKNET_PRIVKEY || ''
  );

  clientsMap.set(chainId, { provider, client, account });

  return { provider, client, account };
}
