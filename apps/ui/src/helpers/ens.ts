import { namehash } from '@ethersproject/hash';
import { getProvider } from '@/helpers/provider';
import { call } from '@/helpers/call';

const abi = ['function addr(bytes32 node) view returns (address r)'];

const ensPublicResolvers = {
  1: '0x4976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41',
  5: '0xd7a4F6473f32aC2Af804B3686AE8F1932bC35750'
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
