import { namehash } from '@ethersproject/hash';
import { getProvider } from '@/helpers/provider';
import { call } from '@/helpers/call';

const abi = ['function addr(bytes32 node) view returns (address r)'];

const ensPublicResolvers = {
  1: '0x231b0ee14048e9dccd1d247744d114a4eb5e8e63',
  5: '0xd7a4F6473f32aC2Af804B3686AE8F1932bC35750',
  11155111: '0x8fade66b79cc9f707ab26799354482eb93a5b7dd'
};

export async function resolveName(name: string, chainId: number) {
  const resolver = ensPublicResolvers[chainId];
  if (!resolver) throw new Error('Unsupported chainId');

  const provider = getProvider(chainId);
  const node = namehash(name);

  const address: string = await call(provider, abi, [resolver, 'addr', [node]], {
    blockTag: 'latest'
  });

  if (address === '0x0000000000000000000000000000000000000000') return null;

  return address;
}
