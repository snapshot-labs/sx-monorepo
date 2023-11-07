import { NetworkID } from '@/types';
import { Provider } from 'starknet';

export function createProvider(networkId: NetworkID) {
  let baseUrl: string;
  if (networkId === 'sn-tn') baseUrl = 'https://alpha4.starknet.io';
  else if (networkId === 'sn-tn2') baseUrl = 'https://alpha4-2.starknet.io';
  else throw new Error('Invalid networkId');

  return new Provider({
    sequencer: {
      baseUrl: baseUrl
    }
  });
}
