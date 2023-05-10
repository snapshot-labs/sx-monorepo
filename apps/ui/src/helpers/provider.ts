import { StaticJsonRpcProvider } from '@ethersproject/providers';

const providers: Record<number, StaticJsonRpcProvider | undefined> = {};

export function getProvider(networkId: number): StaticJsonRpcProvider {
  const url = `https://rpc.snapshotx.xyz/${networkId}`;

  let provider = providers[networkId];

  if (!provider) {
    provider = new StaticJsonRpcProvider({ url, timeout: 25000 }, networkId);
    providers[networkId] = provider;
  }

  return provider;
}
