import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import updateLocale from 'dayjs/plugin/updateLocale';
import duration from 'dayjs/plugin/duration';
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getUrl as snapshotGetUrl } from '@snapshot-labs/snapshot.js/src/utils';
import pkg from '@/../package.json';
import type { Web3Provider } from '@ethersproject/providers';
import type { SpaceMetadata } from '@/types';

const IPFS_GATEWAY: string = import.meta.env.VITE_IPFS_GATEWAY || 'https://cloudflare-ipfs.com';

dayjs.extend(relativeTime);
dayjs.extend(updateLocale);
dayjs.extend(duration);

dayjs.updateLocale('en', {
  relativeTime: {
    future: value => {
      if (value === 'now') return 'in few seconds';
      return `${value} left`;
    },
    past: value => {
      if (value === 'now') return 'just now';
      return `${value} ago`;
    },
    s: 'now',
    m: '1m',
    mm: '%dm',
    h: '1h',
    hh: '%dh',
    d: '1d',
    dd: '%dd',
    M: '1m',
    MM: '%dm',
    y: '1y',
    yy: '%dy'
  }
});

export function getUrl(str: string) {
  return snapshotGetUrl(str, IPFS_GATEWAY);
}

export function shortenAddress(str = '') {
  return `${str.slice(0, 6)}...${str.slice(str.length - 4)}`;
}

export function shorten(str: string, key?: any): string {
  if (!str) return str;
  let limit;
  if (typeof key === 'number') limit = key;
  if (key === 'symbol') limit = 6;
  if (key === 'name') limit = 64;
  if (key === 'choice') limit = 12;
  if (limit) return str.length > limit ? `${str.slice(0, limit).trim()}...` : str;
  return shortenAddress(str);
}

export function explorerUrl(network, str: string, type = 'address'): string {
  if (network === 'starknet') type = 'contract';
  return `${networks[network].explorer}/${type}/${str}`;
}

export function _n(value: any, notation: 'standard' | 'compact' = 'standard') {
  const formatter = new Intl.NumberFormat('en', { notation });
  return formatter.format(value);
}

export function jsonParse(input, fallback?) {
  if (typeof input !== 'string') {
    return fallback || {};
  }
  try {
    return JSON.parse(input);
  } catch (err) {
    return fallback || {};
  }
}

export function lsSet(key: string, value: any) {
  return localStorage.setItem(`${pkg.name}.${key}`, JSON.stringify(value));
}

export function lsGet(key: string, fallback?: any) {
  const item = localStorage.getItem(`${pkg.name}.${key}`);
  return jsonParse(item, fallback);
}

export function lsRemove(key: string) {
  return localStorage.removeItem(`${pkg.name}.${key}`);
}

export function _d(s: number) {
  const duration = dayjs.duration(s, 'seconds');
  const daysLeft = Math.floor(duration.asDays());

  return duration
    .format(`[${daysLeft}d] H[h] m[m] s[s]`)
    .replace(/\b0+[a-z]+\s*/gi, '')
    .trim();
}

export function _t(number) {
  try {
    return dayjs(number * 1e3).format('MMM D, YYYY · h:mm A');
  } catch (e) {
    console.log(e);
    return '';
  }
}

export function _rt(number) {
  try {
    return dayjs(number * 1e3).fromNow(false);
  } catch (e) {
    console.log(e);
    return '';
  }
}

export function abiToDefinition(abi) {
  const definition = {
    title: abi.name,
    type: 'object',
    properties: {},
    additionalProperties: false
  };
  abi.inputs.forEach(input => {
    definition.properties[input.name] = {};
    let type = 'string';
    if (input.type === 'bool') type = 'boolean';
    if (input.type === 'uint256') {
      definition.properties[input.name].format = 'uint256';
      definition.properties[input.name].examples = ['0'];
    }
    if (input.type === 'int256') {
      definition.properties[input.name].format = 'int256';
      definition.properties[input.name].examples = ['0'];
    }
    if (input.type === 'address') {
      definition.properties[input.name].format = 'address';
      definition.properties[input.name].examples = ['0x0000…'];
    }
    definition.properties[input.name].type = type;
    definition.properties[input.name].title = `${input.name} (${input.type})`;
  });
  return definition;
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const entries = Object.entries(obj) as [K, any];

  return Object.fromEntries(entries.filter(([k]) => !keys.includes(k))) as Omit<T, K>;
}

export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function verifyNetwork(web3Provider: Web3Provider, chainId: number) {
  if (!web3Provider.provider.request) return;

  const network = await web3Provider.getNetwork();
  if (network.chainId === chainId) return;

  await web3Provider.provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: `0x${chainId.toString(16)}` }]
  });
}

/**
 * This function creates ERC1155 metadata object for space. external_url is stored
 * at top level same as OpenSea, other extra properties are stored in the
 * properties object per ERC1155 spec.
 * @param metadata space metadata
 * @returns ERC1155 metadata object
 */
export function createErc1155Metadata(metadata: SpaceMetadata) {
  return {
    name: metadata.name,
    description: metadata.description,
    external_url: metadata.externalUrl,
    properties: {
      github: metadata.github,
      twitter: metadata.twitter,
      discord: metadata.discord,
      wallets: [`${metadata.walletNetwork}:${metadata.walletAddress}`]
    }
  };
}

export function compareAddresses(a: string, b: string): boolean {
  // TODO: in future ignore padding as well
  return a.toLowerCase() === b.toLowerCase();
}
