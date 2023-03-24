import { StaticJsonRpcProvider } from '@ethersproject/providers';

export function createProvider(RPC_URL: string) {
  return new StaticJsonRpcProvider(RPC_URL);
}
