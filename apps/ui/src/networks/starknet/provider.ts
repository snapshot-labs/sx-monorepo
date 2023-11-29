import { RpcProvider } from 'starknet';

export function createProvider(nodeUrl: string) {
  return new RpcProvider({
    nodeUrl
  });
}
