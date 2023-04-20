import { StaticJsonRpcProvider } from '@ethersproject/providers';

const providers = {};

export function getProvider(networkId: string | number) {
  const url = `https://brovider.xyz/${networkId}`;

  if (!providers[networkId]) {
    providers[networkId] = new StaticJsonRpcProvider({ url, timeout: 25000 });
  }

  return providers[networkId];
}
