import { Account, constants, Provider } from 'starknet';
import { clients, goerli1, goerli2 } from '@snapshot-labs/sx';

export const NETWORKS = {
  [constants.StarknetChainId.SN_GOERLI]: goerli1,
  [constants.StarknetChainId.SN_GOERLI2]: goerli2
} as const;

const clientsMap = new Map<
  string,
  {
    provider: Provider;
    client: clients.StarkNetTx;
    account: Account;
  }
>();

function getProvider(chainId: string) {
  const baseUrl =
    chainId === constants.StarknetChainId.SN_GOERLI
      ? 'https://alpha4.starknet.io'
      : 'https://alpha4-2.starknet.io';

  return new Provider({
    sequencer: {
      baseUrl
    }
  });
}

export function getClient(chainId: string) {
  const cached = clientsMap.get(chainId);
  if (cached) return cached;

  const provider = getProvider(chainId);

  const client = new clients.StarkNetTx({
    starkProvider: provider,
    ethUrl: process.env.ETH_RPC_URL as string
  });

  const account = new Account(
    provider,
    process.env.STARKNET_ADDRESS || '',
    process.env.STARKNET_PRIVKEY || ''
  );

  clientsMap.set(chainId, { provider, client, account });

  return { provider, client, account };
}
