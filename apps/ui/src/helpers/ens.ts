import { Signer } from '@ethersproject/abstract-signer';
import { getAddress, isAddress } from '@ethersproject/address';
import { Contract } from '@ethersproject/contracts';
import { ensNormalize, namehash } from '@ethersproject/hash';
import { call, multicall } from './call';
import { EMPTY_ADDRESS } from './constants';
import { getProvider } from './provider';
import { getAddresses } from './stamp';

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
    11155111: [
      '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD',
      '0x8948458626811dd0c23EB25Cc74291247077cC51'
    ]
  },
  nameWrappers: {
    1: '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401',
    11155111: '0x0635513f179D50A207757E05759CbD106d7dFcE8'
  }
};

// see https://docs.ens.domains/registry/dns#gasless-import
async function getDNSOwner(domain: string): Promise<string> {
  const response = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${domain}&type=TXT`,
    {
      headers: {
        accept: 'application/dns-json'
      }
    }
  );

  if (!response.ok) throw new Error('Failed to fetch DNS Owner');

  const data = await response.json();
  // Error list: https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml#dns-parameters-6
  if (data.Status === 3) return EMPTY_ADDRESS;
  if (data.Status !== 0) throw new Error('Failed to fetch DNS Owner');

  const ownerRecord = data.Answer?.find((record: any) =>
    record.data.includes('ENS1')
  );

  if (!ownerRecord) return EMPTY_ADDRESS;

  return getAddress(
    ownerRecord.data.replace(new RegExp('"', 'g'), '').split(' ').pop()
  );
}

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

  if (address === EMPTY_ADDRESS) return null;

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

  const resolverAddress = await call(
    getProvider(chainId),
    ENS_CONTRACTS.registryAbi,
    [ENS_CONTRACTS.registry, 'resolver', [ensHash]]
  );

  if (!resolvers.includes(resolverAddress))
    throw new Error('Unsupported resolver');

  const contract = new Contract(
    resolverAddress,
    ENS_CONTRACTS.resolverAbi,
    signer
  );

  return contract.setText(ensHash, record, value);
}

export async function getNameOwner(name: string, chainId: ENSChainId) {
  const provider = getProvider(chainId);
  const ensHash = namehash(name);

  let owner = await call(
    provider,
    ENS_CONTRACTS.registryAbi,
    [ENS_CONTRACTS.registry, 'owner', [ensHash]],
    {
      blockTag: 'latest'
    }
  );

  if (!name.endsWith('.eth') && owner === EMPTY_ADDRESS) {
    const resolvedAddress = (await getAddresses([name], chainId))[name];
    const nameTokens = name.split('.');

    if (nameTokens.length > 2) {
      owner = resolvedAddress || EMPTY_ADDRESS;
    } else if (nameTokens.length === 2 && resolvedAddress) {
      owner = await getDNSOwner(name);
    }
  }

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
