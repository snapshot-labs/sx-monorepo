import { NetworkID } from '@/types';
import { RpcProvider } from 'starknet';

export function createProvider(networkId: NetworkID) {
  let baseUrl: string;
  if (networkId === 'sn-tn') baseUrl = import.meta.env.VITE_STARK_RPC_URL;
  else throw new Error('Invalid networkId');

  return new RpcProvider({
    nodeUrl: baseUrl
  });
}
