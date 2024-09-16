import { namehash } from '@ethersproject/hash';
import { call } from '@/helpers/call';
import { getProvider } from '@/helpers/provider';

type ENSChainId = 1 | 11155111;

type ENSContracts = {
  registry: string;
  registryAbi: string[];
  resolvers: Record<ENSChainId, string>;
  resolverAbi: string[];
  nameWrappers: Record<ENSChainId, string>;
  nameWrapperAbi: string[];
};

const ENS_CONTRACTS: ENSContracts = {
  registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  registryAbi: ['function owner(bytes32) view returns (address)'],
  resolverAbi: ['function addr(bytes32 node) view returns (address r)'],
  nameWrapperAbi: ['function ownerOf(uint256) view returns (address)'],
  resolvers: {
    1: '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63',
    11155111: '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD'
  },
  nameWrappers: {
    1: '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401',
    11155111: '0x0635513f179D50A207757E05759CbD106d7dFcE8'
  }
};

export async function resolveName(name: string, chainId: ENSChainId) {
  const resolver = ENS_CONTRACTS.resolvers[chainId];
  if (!resolver) throw new Error('Unsupported chainId');

  const provider = getProvider(chainId);
  const node = namehash(name);

  const address: string = await call(
    provider,
    ENS_CONTRACTS.resolverAbi,
    [resolver, 'addr', [node]],
    {
      blockTag: 'latest'
    }
  );

  if (address === '0x0000000000000000000000000000000000000000') return null;

  return address;
}

export async function getNameOwner(name: string, chainId: ENSChainId) {
  const provider = getProvider(chainId);
  const ensHash = namehash(name);

  const owner = await call(
    provider,
    ENS_CONTRACTS.registryAbi,
    [ENS_CONTRACTS.registry, 'owner', [ensHash]],
    {
      blockTag: 'latest'
    }
  );

  if (owner !== ENS_CONTRACTS.nameWrappers[chainId]) return owner;

  return call(
    provider,
    ENS_CONTRACTS.nameWrapperAbi,
    [ENS_CONTRACTS.nameWrappers[chainId], 'ownerOf', [ensHash]],
    {
      blockTag: 'latest'
    }
  );
}
