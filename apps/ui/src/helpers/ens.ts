import { Signer } from '@ethersproject/abstract-signer';
import { getAddress, isAddress } from '@ethersproject/address';
import { concat, hexlify } from '@ethersproject/bytes';
import { Contract } from '@ethersproject/contracts';
import { ensNormalize, namehash } from '@ethersproject/hash';
import { toUtf8Bytes } from '@ethersproject/strings';
import { call } from './call';
import { EVM_EMPTY_ADDRESS } from './constants';
import { getProvider } from './provider';
import { getAddresses } from './stamp';

export type ENSChainId = 1 | 11155111;

type ENSContracts = {
  registry: string;
  registryAbi: string[];
  resolvers: Record<ENSChainId, string[]>;
  resolverAbi: string[];
  universalResolver: string;
  universalResolverAbi: string[];
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
  // see https://docs.ens.domains/resolvers/universal
  universalResolver: '0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe',
  universalResolverAbi: [
    'function findOwner(bytes name) view returns (address)'
  ],
  nameWrapperAbi: ['function ownerOf(uint256) view returns (address)'],
  resolvers: {
    1: [
      '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63',
      '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
      '0xF29100983E058B709F3D539b0c765937B804AC15'
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

// not @ethersproject/hash's dnsEncode: that rejects labels over 63 bytes,
// which the Universal Resolver accepts and some live space names need
function dnsEncodeName(name: string): string {
  const labels = name.split('.').map(label => toUtf8Bytes(label));

  return hexlify(
    concat([
      ...labels.flatMap(label => [Uint8Array.of(label.length), label]),
      Uint8Array.of(0)
    ])
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

async function deepResolve(
  chainId: ENSChainId,
  node: string,
  property: string,
  params: any[]
) {
  const provider = getProvider(chainId);
  if (!ENS_CONTRACTS.resolvers[chainId]) throw new Error('Unsupported chainId');

  const resolverAddress: string = await call(
    provider,
    ENS_CONTRACTS.registryAbi,
    [ENS_CONTRACTS.registry, 'resolver', [node]]
  );

  if (!resolverAddress || resolverAddress === EVM_EMPTY_ADDRESS) return null;

  try {
    return await call(provider, ENS_CONTRACTS.resolverAbi, [
      resolverAddress,
      property,
      params
    ]);
  } catch (err: any) {
    // The resolver reverts on this method (CCIP-read, ENS v2, or a broken
    // resolver). Treat as "no record", matching the old multicall path, so
    // callers degrade gracefully (e.g. getSpaceController falls back to the
    // name owner) instead of throwing. Network/timeout errors are re-thrown
    // so a transient RPC failure is not silently read as "no record".
    if (err?.code === 'CALL_EXCEPTION') return null;
    throw err;
  }
}

export async function resolveName(name: string, chainId: ENSChainId) {
  const resolver = ENS_CONTRACTS.resolvers[chainId];
  if (!resolver) throw new Error('Unsupported chainId');

  const node = namehash(name);

  const address: string = await deepResolve(chainId, node, 'addr', [node]);

  if (address === EVM_EMPTY_ADDRESS) return null;

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
  } catch {
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
  if (!ENS_CONTRACTS.resolvers[chainId]) throw new Error('Unsupported chainId');

  const ensHash = namehash(ensNormalize(ens));

  const resolverAddress = await call(
    getProvider(chainId),
    ENS_CONTRACTS.registryAbi,
    [ENS_CONTRACTS.registry, 'resolver', [ensHash]]
  );

  if (!resolverAddress || resolverAddress === EVM_EMPTY_ADDRESS)
    throw new Error('No resolver set for name');

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

  // findOwner is ENSv2-only, live on Sepolia and not yet on mainnet. A name
  // absent from ENSv2 resolves the empty address successfully, so any revert
  // is a genuine failure and must throw, never resolve a stale v1 owner
  if (chainId === 11155111) {
    const ensOwnerV2 = await call(
      provider,
      ENS_CONTRACTS.universalResolverAbi,
      [ENS_CONTRACTS.universalResolver, 'findOwner', [dnsEncodeName(name)]]
    );

    if (ensOwnerV2 && ensOwnerV2 !== EVM_EMPTY_ADDRESS) return ensOwnerV2;
  }

  let owner = await call(
    provider,
    ENS_CONTRACTS.registryAbi,
    [ENS_CONTRACTS.registry, 'owner', [ensHash]],
    {
      blockTag: 'latest'
    }
  );

  if (!name.endsWith('.eth') && owner === EVM_EMPTY_ADDRESS) {
    const resolvedAddress = (await getAddresses([name], chainId))[name];
    const nameTokens = name.split('.');

    if (nameTokens.length > 2) {
      owner = resolvedAddress || EVM_EMPTY_ADDRESS;
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
