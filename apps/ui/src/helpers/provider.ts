import { StaticJsonRpcProvider } from '@ethersproject/providers';

const providers: Record<string, StaticJsonRpcProvider | undefined> = {};

export function getProvider(networkId: string): StaticJsonRpcProvider {
  const url = `https://rpc.snapshot.org/${networkId}`;

  let provider = providers[networkId];

  if (!provider) {
    provider = new StaticJsonRpcProvider(
      { url, timeout: 25000 },
      parseInt(networkId)
    );
    providers[networkId] = provider;
  }

  return provider;
}
