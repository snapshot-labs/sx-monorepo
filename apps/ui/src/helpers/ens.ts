import { isAddress } from '@ethersproject/address';
import { namehash } from '@ethersproject/hash';
import { getProvider } from '@/helpers/provider';
import { call } from '@/helpers/call';

const abi = [
  'function getNames(address[] addresses) view returns (string[] r)',
  'function addr(bytes32 node) view returns (address r)'
];

const ensPublicResolvers = {
  1: '0x4976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41',
  5: '0xd7a4F6473f32aC2Af804B3686AE8F1932bC35750'
};

export async function getNames(addresses: string[]) {
  addresses = addresses.slice(0, 250).filter(isAddress);
  if (addresses.length === 0) return {};
  const network = 1;
  const provider = getProvider(network);

  try {
    const names = await call(
      provider,
      abi,
      ['0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C', 'getNames', [addresses]],
      { blockTag: 'latest' }
    );
    return Object.fromEntries(addresses.map((address, i) => [address, names[i]]));
  } catch (e) {
    console.error('failed to reverse resolve names', e);
    return {};
  }
}

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
