import { JsonRpcProvider } from '@ethersproject/providers';

export function createProvider(RPC_URL: string) {
  return new JsonRpcProvider(RPC_URL);
}
