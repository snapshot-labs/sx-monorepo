import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import updateLocale from 'dayjs/plugin/updateLocale';
import duration from 'dayjs/plugin/duration';
import sha3 from 'js-sha3';
import { sanitizeUrl as baseSanitizeUrl } from '@braintree/sanitize-url';
import { getAddress } from '@ethersproject/address';
import { validateAndParseAddress } from 'starknet';
import networks from '@/helpers/networks.json';
import pkg from '@/../package.json';
import type { Web3Provider } from '@ethersproject/providers';
import { upload as pin } from '@snapshot-labs/pineapple';
import type { Proposal, SpaceMetadata } from '@/types';
import { MAX_SYMBOL_LENGTH } from './constants';

const IPFS_GATEWAY: string = import.meta.env.VITE_IPFS_GATEWAY || 'https://cloudflare-ipfs.com';
const ADDABLE_NETWORKS = {
  59140: {
    chainName: 'Linea Goerli test network',
    nativeCurrency: {
      name: 'LineaETH',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://rpc.goerli.linea.build'],
    blockExplorerUrls: ['https://goerli.lineascan.build']
  }
};

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

export function getUrl(uri: string) {
  const ipfsGateway = `https://${IPFS_GATEWAY}`;
  if (!uri) return null;
  if (
    !uri.startsWith('ipfs://') &&
    !uri.startsWith('ipns://') &&
    !uri.startsWith('https://') &&
    !uri.startsWith('http://')
  ) {
    return `${ipfsGateway}/ipfs/${uri}`;
  }

  const uriScheme = uri.split('://')[0];
  if (uriScheme === 'ipfs') return uri.replace('ipfs://', `${ipfsGateway}/ipfs/`);
  if (uriScheme === 'ipns') return uri.replace('ipns://', `${ipfsGateway}/ipns/`);
  return uri;
}

export function sanitizeUrl(url: string): string | null {
  const sanitized = baseSanitizeUrl(url);
  if (sanitized === 'about:blank') return null;

  return sanitized;
}

export function shortenAddress(str = '') {
  const formatted = formatAddress(str);

  return `${formatted.slice(0, 6)}...${formatted.slice(formatted.length - 4)}`;
}

export function shorten(str: string, key?: number | 'symbol' | 'name' | 'choice'): string {
  if (!str) return str;
  let limit;
  if (typeof key === 'number') limit = key;
  if (key === 'symbol') limit = MAX_SYMBOL_LENGTH;
  if (key === 'name') limit = 64;
  if (key === 'choice') limit = 12;
  if (limit) return str.length > limit ? `${str.slice(0, limit).trim()}...` : str;
  return shortenAddress(str);
}

export function formatAddress(address: string) {
  if (address.length === 42) return getAddress(address);
  try {
    return validateAndParseAddress(address);
  } catch {
    return address;
  }
}

export function explorerUrl(network, str: string, type = 'address'): string {
  if (network === 'starknet') type = 'contract';
  return `${networks[network].explorer}/${type}/${str}`;
}

export function getProposalId(proposal: Proposal) {
  const proposalId = proposal.proposal_id.toString();

  if (proposalId.startsWith('0x')) {
    return `#${proposalId.slice(2, 7)}`;
  }

  if ([46, 59].includes(proposalId.length)) {
    return `#${proposalId.slice(-5)}`;
  }

  return `#${proposalId}`;
}

export function _n(
  value: any,
  notation: 'standard' | 'compact' = 'standard',
  { maximumFractionDigits }: { maximumFractionDigits?: number } = {}
) {
  const formatter = new Intl.NumberFormat('en', { notation, maximumFractionDigits });
  return formatter.format(value).toLowerCase();
}

export function getCurrentName(currentUnit: 'block' | 'second') {
  if (currentUnit === 'block') return 'blocks';
  return 'seconds';
}

export function _c(value: string | bigint, decimals = 18) {
  const raw = BigInt(value);
  const parsed = Number(raw) / 10 ** decimals;
  if (raw !== 0n && parsed < 0.001) return `~0`;

  const formatter = new Intl.NumberFormat('en', { maximumFractionDigits: 3 });
  return formatter.format(parsed);
}

export function _p(value: number) {
  const formatter = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 2 });
  return formatter.format(value);
}

export function jsonParse(input, fallback?) {
  if (typeof input !== 'string') {
    return fallback || {};
  }
  try {
    return JSON.parse(input);
  } catch (e) {
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

export function _t(number, format = 'MMM D, YYYY · h:mm A') {
  try {
    return dayjs(number * 1e3).format(format);
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
    $async: true,
    title: abi.name,
    type: 'object',
    required: [] as string[],
    additionalProperties: false,
    properties: {}
  };
  abi.inputs.forEach(input => {
    definition.properties[input.name] = {};
    definition.required.push(input.name);
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
      definition.properties[input.name].format = 'ens-or-address';
      definition.properties[input.name].examples = ['0x0000…'];
    }
    if (input.type.endsWith('[]')) {
      definition.properties[input.name].format = input.type;
      definition.properties[input.name].examples = ['0x0, 0x1'];
    }
    definition.properties[input.name].type = type;
    definition.properties[input.name].title = `${input.name} (${input.type})`;
  });
  return definition;
}

export function memoize<T extends any[], U>(fn: (...args: T) => U) {
  const cache = new Map<string, any>();

  return (...args: T): U => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);

    return result;
  };
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

  const encodedChainId = `0x${chainId.toString(16)}`;

  try {
    await web3Provider.provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: encodedChainId }]
    });
  } catch (err) {
    if (err.code !== 4902 || !ADDABLE_NETWORKS) throw new Error(err.message);

    await web3Provider.provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: encodedChainId,
          chainName: ADDABLE_NETWORKS[chainId].chainName,
          nativeCurrency: ADDABLE_NETWORKS[chainId].nativeCurrency,
          rpcUrls: ADDABLE_NETWORKS[chainId].rpcUrls,
          blockExplorerUrls: ADDABLE_NETWORKS[chainId].blockExplorerUrls
        }
      ]
    });

    const network = await web3Provider.getNetwork();
    if (network.chainId !== chainId) {
      const error = new Error('User rejected network change after it being added');
      (error as any).code = 4001;
      throw error;
    }
  }
}

/**
 * This function creates ERC1155 metadata object for space. external_url is stored
 * at top level same as OpenSea, other extra properties are stored in the
 * properties object per ERC1155 spec.
 * @param metadata space metadata
 * @returns ERC1155 metadata object
 */
export function createErc1155Metadata(
  metadata: SpaceMetadata,
  extraProperties?: Record<string, any>
) {
  return {
    name: metadata.name,
    avatar: metadata.avatar,
    description: metadata.description,
    external_url: metadata.externalUrl,
    properties: {
      voting_power_symbol: metadata.votingPowerSymbol,
      cover: metadata.cover,
      github: metadata.github,
      twitter: metadata.twitter,
      discord: metadata.discord,
      treasuries: metadata.treasuries.map(treasury => ({
        name: treasury.name,
        network: treasury.network,
        address: treasury.address
      })),
      delegations: metadata.delegations.map(delegation => ({
        name: delegation.name,
        api_type: delegation.apiType,
        api_url: delegation.apiUrl,
        contract: `${delegation.contractNetwork}:${delegation.contractAddress}`
      })),
      ...extraProperties
    }
  };
}

export function compareAddresses(a: string, b: string): boolean {
  if (a.length > 42 && b.length > 42) {
    return validateAndParseAddress(a) === validateAndParseAddress(b);
  }

  // TODO: in future ignore padding as well
  return a.toLowerCase() === b.toLowerCase();
}

export function getSalt() {
  const buffer = new Uint8Array(30);
  crypto.getRandomValues(buffer);

  return `0x${buffer.reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '')}`;
}

export function getCacheHash(value?: string) {
  return value ? sha3.sha3_256(value).slice(0, 16) : undefined;
}

export function getStampUrl(
  type: 'avatar' | 'space' | 'space-sx' | 'space-cover-sx' | 'token',
  id: string,
  size: number | { width: number; height: number },
  hash?: string
) {
  let sizeParam = '';
  if (typeof size === 'number') {
    sizeParam = `?s=${size * 2}`;
  } else {
    sizeParam = `?w=${size.width}&h=${size.height}`;
  }

  const cacheParam = hash ? `&cb=${hash}` : '';

  const formattedId = ['avatar', 'space-sx', 'space-cover-sx'].includes(type)
    ? formatAddress(id)
    : id;

  return `https://cdn.stamp.fyi/${type}/${formattedId}${sizeParam}${cacheParam}`;
}

export async function imageUpload(file: File) {
  if (!file) return;
  // TODO: Additional Validations - File Size, File Type, Empty File, Hidden File
  if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  try {
    const receipt = await pin(formData);
    return { name: file.name, url: `ipfs://${receipt.cid}` };
  } catch (e) {
    console.error(e);
  }
}

export function simplifyURL(fullURL: string): string {
  const url = new URL(fullURL);
  return `${url.hostname}${url.pathname.replace(/\/$/, '')}`;
}

export function getChoiceWeight(selectedChoices: Record<string, number>, index: number) {
  const whole = Object.values(selectedChoices).reduce((a, b) => a + b, 0);
  const percent = selectedChoices[index + 1] / whole;

  return isNaN(percent) ? 0 : percent;
}

export function getChoiceText(
  availableChoices: string[],
  choice: number | number[] | Record<string, number>
) {
  if (typeof choice === 'number') {
    return availableChoices[choice - 1];
  }

  if (Array.isArray(choice)) {
    return choice.map(index => availableChoices[index - 1]).join(', ');
  }

  const total = Object.values(choice).reduce((acc, weight) => acc + weight, 0);

  return Object.entries(choice)
    .filter(([, weight]) => weight > 0)
    .map(([index, weight]) => `${_p(weight / total)} for ${availableChoices[Number(index) - 1]}`)
    .join(', ');
}
