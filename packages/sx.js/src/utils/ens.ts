import { getAddress, isAddress } from '@ethersproject/address';
import { Contract } from '@ethersproject/contracts';
import { ensNormalize, namehash } from '@ethersproject/hash';
import { Provider } from '@ethersproject/providers';

export type ENSChainId = 1 | 11155111;

export const EVM_EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

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
    'function text(bytes32 node, string key) view returns (string)'
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

async function call(
  provider: Provider,
  abi: string[],
  params: [string, string, any[]],
  options?: { blockTag?: string }
): Promise<any> {
  const [address, method, args] = params;
  const contract = new Contract(address, abi, provider);
  return contract[method](...args, options);
}

async function multicall(
  provider: Provider,
  abi: string[],
  calls: [string, string, any[]][]
): Promise<any[][]> {
  const results = await Promise.all(
    calls.map(([address, method, args]) =>
      call(provider, abi, [address, method, args]).catch(() => [null])
    )
  );
  return results;
}

async function deepResolve(
  provider: Provider,
  chainId: ENSChainId,
  node: string,
  property: string,
  params: any[]
) {
  const resolvers = ENS_CONTRACTS.resolvers[chainId];
  if (!resolvers) throw new Error('Unsupported chainId');

  const calls: [string, string, any[]][] = [
    [ENS_CONTRACTS.registry, 'resolver', [node]],
    ...resolvers.map(
      resolver => [resolver, property, params] as [string, string, any[]]
    )
  ];

  const allAbi = [...ENS_CONTRACTS.registryAbi, ...ENS_CONTRACTS.resolverAbi];
  const [[resolverAddress], ...textRecords]: any[][] = await multicall(
    provider,
    allAbi,
    calls
  );

  const resolverIndex = resolvers.indexOf(resolverAddress);
  return resolverIndex !== -1 ? textRecords[resolverIndex]?.[0] : null;
}

/**
 * Get an ENS text record for a given name
 */
export async function getEnsTextRecord(
  provider: Provider,
  ens: string,
  record: string,
  chainId: ENSChainId
): Promise<string | null> {
  const resolvers = ENS_CONTRACTS.resolvers[chainId];
  if (!resolvers) throw new Error('Unsupported chainId');

  let ensHash: string;

  try {
    ensHash = namehash(ensNormalize(ens));
  } catch {
    return null;
  }

  return deepResolve(provider, chainId, ensHash, 'text', [ensHash, record]);
}

/**
 * Get the owner of an ENS name
 */
export async function getNameOwner(
  provider: Provider,
  name: string,
  chainId: ENSChainId
): Promise<string> {
  const ensHash = namehash(name);

  let owner = await call(
    provider,
    ENS_CONTRACTS.registryAbi,
    [ENS_CONTRACTS.registry, 'owner', [ensHash]],
    {
      blockTag: 'latest'
    }
  );

  // Handle DNS names (non-.eth domains)
  if (!name.endsWith('.eth') && owner === EVM_EMPTY_ADDRESS) {
    // For DNS names, try to get the DNS owner if it's a 2nd level domain
    const nameTokens = name.split('.');
    if (nameTokens.length === 2) {
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
  if (data.Status === 3) return EVM_EMPTY_ADDRESS;
  if (data.Status !== 0) throw new Error('Failed to fetch DNS Owner');

  const ownerRecord = data.Answer?.find((record: any) =>
    record.data.includes('ENS1')
  );

  if (!ownerRecord) return EVM_EMPTY_ADDRESS;

  return getAddress(
    ownerRecord.data.replace(new RegExp('"', 'g'), '').split(' ').pop()
  );
}

/**
 * Get the controller address for an ENS-based Snapshot space
 * 
 * This function first checks for a 'snapshot' text record on the ENS domain.
 * If found and it contains an address, that address is used as the controller.
 * Otherwise, it falls back to the ENS domain owner.
 */
export async function getEnsSpaceController(
  provider: Provider,
  name: string,
  chainId: ENSChainId
): Promise<string> {
  const snapshotRecord = await getEnsTextRecord(
    provider,
    name,
    'snapshot',
    chainId
  );

  if (snapshotRecord) {
    if (isAddress(snapshotRecord)) return snapshotRecord;

    const uriParts = snapshotRecord.split('/');
    const position = uriParts.includes('testnet') ? 5 : 4;
    const address = uriParts[position];
    if (isAddress(address)) return address;
  }

  return getNameOwner(provider, name, chainId);
}
