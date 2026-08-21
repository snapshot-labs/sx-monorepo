import { defaultAbiCoder, Interface } from '@ethersproject/abi';
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

type DomainType = 'ens' | 'tld' | 'other-tld' | 'subdomain';

type ENSContracts = {
  registry: string;
  registryAbi: string[];
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
  nameWrappers: {
    1: '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401',
    11155111: '0x0635513f179D50A207757E05759CbD106d7dFcE8'
  }
};

// see https://docs.ens.domains/resolvers/universal
const UNIVERSAL_RESOLVER = '0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe';
const UNIVERSAL_RESOLVER_ABI = [
  'function resolve(bytes name, bytes data) view returns (bytes, address)',
  'function findOwner(bytes name) view returns (address)'
];
const RESOLVER_PROFILE = new Interface(ENS_CONTRACTS.resolverAbi);

const RESOLVER_NOT_FOUND = '0x77209fe8';
const RESOLVER_NOT_CONTRACT = '0x1e9535f2';
const UNSUPPORTED_RESOLVER_PROFILE = '0x7b1c461b';
const RESOLVER_ERROR = '0x95c0c752';
const HTTP_ERROR = '0x01800152';
const NOT_IMPLEMENTED = '0xd6234725';

function getDomainType(domain: string): DomainType {
  const isEns = domain.endsWith('.eth');
  const tokens = domain.split('.');

  if (tokens.length === 1) return 'tld';
  else if (tokens.length === 2 && !isEns) return 'other-tld';
  else if (tokens.length > 2) return 'subdomain';
  return 'ens';
}

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

function revertData(err: any): string | null {
  const data = err?.data ?? err?.error?.data ?? err?.error?.error?.data;

  return typeof data === 'string' && data.startsWith('0x') ? data : null;
}

// reverts that mean "no record"; anything else (gateway 5xx, RPC failure)
// must throw, since falling through to the name owner may show the wrong
// controller. Scoped by name class: a resolver-level error is how DNS
// domains answer any read, so for other-tld names it is a no-record answer
function isNoRecordRevert(domainType: DomainType, err: any): boolean {
  const data = revertData(err);
  if (!data) return false;

  const selector = data.slice(0, 10);

  if (
    selector === RESOLVER_NOT_FOUND ||
    selector === RESOLVER_NOT_CONTRACT ||
    selector === UNSUPPORTED_RESOLVER_PROFILE
  ) {
    return true;
  }

  try {
    if (selector === RESOLVER_ERROR) {
      if (domainType === 'other-tld') return true;

      const [inner] = defaultAbiCoder.decode(['bytes'], `0x${data.slice(10)}`);
      return inner.slice(0, 10) === NOT_IMPLEMENTED;
    }

    if (selector === HTTP_ERROR) {
      const [status] = defaultAbiCoder.decode(
        ['uint16', 'string'],
        `0x${data.slice(10)}`
      );
      return status === 404;
    }
  } catch {
    return false;
  }

  return false;
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

async function urResolve(
  name: string,
  chainId: ENSChainId,
  profile: string,
  params: any[]
) {
  if (!ENS_CONTRACTS.nameWrappers[chainId]) {
    throw new Error('Unsupported chainId');
  }

  try {
    const [result] = await call(
      getProvider(chainId),
      UNIVERSAL_RESOLVER_ABI,
      [
        UNIVERSAL_RESOLVER,
        'resolve',
        [
          dnsEncodeName(name),
          RESOLVER_PROFILE.encodeFunctionData(profile, params)
        ]
      ],
      { ccipReadEnabled: true }
    );

    if (!result || result === '0x') return null;

    return RESOLVER_PROFILE.decodeFunctionResult(profile, result)[0];
  } catch (err: any) {
    if (isNoRecordRevert(getDomainType(name), err)) return null;
    throw err;
  }
}

export async function resolveName(name: string, chainId: ENSChainId) {
  const node = namehash(name);
  const address: string | null = await urResolve(name, chainId, 'addr', [node]);

  if (!address || address === EVM_EMPTY_ADDRESS) return null;

  return address;
}

export async function getEnsTextRecord(
  ens: string,
  record: string,
  chainId: ENSChainId
) {
  let normalized: string;

  try {
    normalized = ensNormalize(ens);
  } catch {
    return null;
  }

  const value = await urResolve(normalized, chainId, 'text', [
    namehash(normalized),
    record
  ]);

  return value || null;
}

export async function setEnsTextRecord(
  signer: Signer,
  ens: string,
  record: string,
  value: string,
  chainId: ENSChainId
) {
  if (!ENS_CONTRACTS.nameWrappers[chainId]) {
    throw new Error('Unsupported chainId');
  }

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
  // findOwner is ENSv2-only, live on Sepolia and not yet on mainnet. A name
  // absent from ENSv2 resolves the empty address successfully, so any revert
  // is a genuine failure and must throw, never resolve a stale v1 owner
  if (chainId === 11155111) {
    const owner = await call(getProvider(chainId), UNIVERSAL_RESOLVER_ABI, [
      UNIVERSAL_RESOLVER,
      'findOwner',
      [dnsEncodeName(name)]
    ]);

    if (owner && owner !== EVM_EMPTY_ADDRESS) return owner;
  }

  return getNameOwnerV1(name, chainId);
}

async function getNameOwnerV1(name: string, chainId: ENSChainId) {
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
