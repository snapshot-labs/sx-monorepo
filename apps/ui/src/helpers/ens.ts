import { Signer } from '@ethersproject/abstract-signer';
import { isAddress } from '@ethersproject/address';
import { Contract } from '@ethersproject/contracts';
import { ensNormalize, namehash } from '@ethersproject/hash';
import { call, multicall } from '@/helpers/call';
import { getProvider } from '@/helpers/provider';

export type ENSChainId = 1 | 11155111;

type ENSContracts = {
  registry: string;
  registryAbi: string[];
  resolvers: Record<ENSChainId, string[]>;
  resolverAbi: string[];
  nameWrappers: Record<ENSChainId, string>;
  nameWrapperAbi: string[];
};

const ENS_CONTRACTS: ENSContracts = {
  registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  registryAbi: [
    'function owner(bytes32) view returns (address)',
    'function resolver(bytes32 node) view returns (address)'
  ],
  resolverAbi: [
    'function addr(bytes32 node) view returns (address r)',
    'function text(bytes32 node, string key) view returns (string)',
    'function setText(bytes32 node, string key, string value)'
  ],
  nameWrapperAbi: ['function ownerOf(uint256) view returns (address)'],
  resolvers: {
    1: [
      '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63',
      '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41'
    ],
    11155111: ['0x8FADE66B79cC9f707aB26799354482EB93a5B7dD']
  },
  nameWrappers: {
    1: '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401',
    11155111: '0x0635513f179D50A207757E05759CbD106d7dFcE8'
  }
};

async function deepResolve(
  chainId: ENSChainId,
  node: string,
  property: string,
  params: any[]
) {
  const provider = getProvider(chainId);
  const resolvers = ENS_CONTRACTS.resolvers[chainId];
  if (!resolvers) throw new Error('Unsupported chainId');

  const calls = [
    [ENS_CONTRACTS.registry, 'resolver', [node]],
    ...resolvers.map(resolver => [resolver, property, params])
  ];

  const [[resolverAddress], ...textRecords]: any[][] = await multicall(
    chainId.toString(),
    provider,
    [...ENS_CONTRACTS.registryAbi, ...ENS_CONTRACTS.resolverAbi],
    calls
  );

  const resolverIndex = resolvers.indexOf(resolverAddress);
  return resolverIndex !== -1 ? textRecords[resolverIndex]?.[0] : null;
}

export async function resolveName(name: string, chainId: ENSChainId) {
  const resolver = ENS_CONTRACTS.resolvers[chainId];
  if (!resolver) throw new Error('Unsupported chainId');

  const node = namehash(name);

  const address: string = await deepResolve(chainId, node, 'addr', [node]);

  if (address === '0x0000000000000000000000000000000000000000') return null;

  return address;
}

export async function getEnsTextRecord(
  ens: string,
  record: string,
  chainId: ENSChainId
) {
  const resolvers = ENS_CONTRACTS.resolvers[chainId];
  if (!resolvers) throw new Error('Unsupported chainId');

  let ensHash: string;

  try {
    ensHash = namehash(ensNormalize(ens));
  } catch (e: any) {
    return null;
  }

  return deepResolve(chainId, ensHash, 'text', [ensHash, record]);
}

export async function setEnsTextRecord(
  signer: Signer,
  ens: string,
  record: string,
  value: string,
  chainId: ENSChainId
) {
  const resolvers = ENS_CONTRACTS.resolvers[chainId];
  if (!resolvers) throw new Error('Unsupported chainId');

  const ensHash = namehash(ensNormalize(ens));

  const contract = new Contract(
    resolvers[0],
    ENS_CONTRACTS.resolverAbi,
    signer
  );

  return contract.setText(ensHash, record, value);
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

export async function getSpaceController(name: string, chainId: ENSChainId) {
  const snapshotRecord = await getEnsTextRecord(name, 'snapshot', chainId);
  if (snapshotRecord) {
    if (isAddress(snapshotRecord)) return snapshotRecord;

    const uriParts = snapshotRecord.split('/');
    const position = uriParts.includes('testnet') ? 5 : 4;
    const address = uriParts[position];
    if (isAddress(address)) return address;
  }

  return getNameOwner(name, chainId);
}
