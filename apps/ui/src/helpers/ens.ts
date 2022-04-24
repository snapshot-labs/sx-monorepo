import getProvider from '@snapshot-labs/snapshot.js/src/utils/provider';
import { call } from '@snapshot-labs/snapshot.js/src/utils';
import { isAddress } from '@ethersproject/address';

export async function getNames(addresses) {
  addresses = addresses.slice(0, 250).filter(isAddress);
  if (addresses.length === 0) return {};
  const network = '1';
  const provider = getProvider(network);
  const abi = [
    {
      inputs: [
        { internalType: 'address[]', name: 'addresses', type: 'address[]' }
      ],
      name: 'getNames',
      outputs: [{ internalType: 'string[]', name: 'r', type: 'string[]' }],
      stateMutability: 'view',
      type: 'function'
    }
  ];
  const names = await call(
    provider,
    abi,
    ['0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C', 'getNames', [addresses]],
    { blockTag: 'latest' }
  );
  return Object.fromEntries(addresses.map((address, i) => [address, names[i]]));
}
