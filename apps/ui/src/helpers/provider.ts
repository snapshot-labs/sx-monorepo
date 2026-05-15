import { StaticJsonRpcProvider } from '@ethersproject/providers';

const BROVIDER_URL = 'https://rpc.brovider.xyz';

export function getRpcUrl(path: string | number): string {
  return `${BROVIDER_URL}/${path}?client=ui`;
}

const providers: Record<number, StaticJsonRpcProvider | undefined> = {};

export function getProvider(networkId: number): StaticJsonRpcProvider {
  const url = getRpcUrl(networkId);

  let provider = providers[networkId];

  if (!provider) {
    provider = new StaticJsonRpcProvider({ url, timeout: 25000 }, networkId);
    providers[networkId] = provider;
  }

  return provider;
}
