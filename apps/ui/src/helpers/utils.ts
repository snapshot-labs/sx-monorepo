import { sanitizeUrl as baseSanitizeUrl } from '@braintree/sanitize-url';
import { FunctionFragment } from '@ethersproject/abi';
import { getAddress, isAddress } from '@ethersproject/address';
import { Web3Provider } from '@ethersproject/providers';
import { upload as pin } from '@snapshot-labs/pineapple';
import Autolinker from 'autolinker';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import updateLocale from 'dayjs/plugin/updateLocale';
import sha3 from 'js-sha3';
import {
  constants as starknetConstants,
  validateAndParseAddress
} from 'starknet';
import { RouteParamsRaw } from 'vue-router';
import { getSpaceController as getEnsSpaceController } from '@/helpers/ens';
import { VotingPowerItem } from '@/queries/votingPower';
import { ChainId, Choice, NetworkID, Proposal, SpaceMetadata } from '@/types';
import { EMPTY_ADDRESS, MAX_SYMBOL_LENGTH } from './constants';
import { getOwner } from './stamp';
import pkg from '@/../package.json';
import ICCoingecko from '~icons/c/coingecko';
import ICDiscord from '~icons/c/discord';
import ICFarcaster from '~icons/c/farcaster';
import ICGithub from '~icons/c/github';
import ICLens from '~icons/c/lens';
import ICX from '~icons/c/x';
import IHGlobeAlt from '~icons/heroicons-outline/globe-alt';

const IPFS_GATEWAY: string =
  import.meta.env.VITE_IPFS_GATEWAY || 'https://cloudflare-ipfs.com';
const ADDABLE_NETWORKS = {
  //   12345: {
  //     chainName: 'My network name',
  //     nativeCurrency: {
  //       name: 'MyNetwork',
  //       symbol: 'NTW',
  //       decimals: 18
  //     },
  //     rpcUrls: ['https://...'],
  //     blockExplorerUrls: ['https://...']
  //   }
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
    M: '1mo',
    MM: '%dmo',
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
  if (uriScheme === 'ipfs')
    return uri.replace('ipfs://', `${ipfsGateway}/ipfs/`);
  if (uriScheme === 'ipns')
    return uri.replace('ipns://', `${ipfsGateway}/ipns/`);
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

export function shorten(
  str: string,
  key?: number | 'symbol' | 'name' | 'choice'
): string {
  if (!str) return str;
  let limit;
  if (typeof key === 'number') limit = key;
  if (key === 'symbol') limit = MAX_SYMBOL_LENGTH;
  if (key === 'name') limit = 64;
  if (key === 'choice') limit = 12;
  if (limit)
    return str.length > limit ? `${str.slice(0, limit).trim()}...` : str;
  return shortenAddress(str);
}

export function formatAddress(address: string) {
  try {
    return address.length === 42
      ? getAddress(address)
      : validateAndParseAddress(address);
  } catch {
    return address;
  }
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
  {
    maximumFractionDigits,
    formatDust = false
  }: { maximumFractionDigits?: number; formatDust?: boolean } = {}
) {
  if (formatDust && value > 0 && value < 0.01) return '~0';

  const formatter = new Intl.NumberFormat('en', {
    notation,
    maximumFractionDigits
  });
  return formatter.format(value).toLowerCase();
}

export function _vp(value: number) {
  return _n(value, 'compact', {
    maximumFractionDigits: value >= 1000 ? 1 : 3,
    formatDust: true
  });
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
  const formatter = new Intl.NumberFormat('en', {
    style: 'percent',
    maximumFractionDigits: 2
  });
  return formatter.format(value);
}

export function jsonParse(input, fallback?) {
  if (typeof input !== 'string') {
    return fallback || {};
  }
  try {
    return JSON.parse(input);
  } catch {
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

export function _d(s: number): string {
  const SECONDS_TO_DAYS = 60 * 60 * 24;
  const SECONDS_TO_HOURS = 60 * 60;
  const SECONDS_TO_MINUTES = 60;

  const days = Math.floor(s / SECONDS_TO_DAYS);
  const hours = Math.floor((s - days * SECONDS_TO_DAYS) / SECONDS_TO_HOURS);
  const minutes = Math.floor(
    (s - days * SECONDS_TO_DAYS - hours * SECONDS_TO_HOURS) / SECONDS_TO_MINUTES
  );
  const seconds =
    s -
    days * SECONDS_TO_DAYS -
    hours * SECONDS_TO_HOURS -
    minutes * SECONDS_TO_MINUTES;

  return `${days}d ${hours}h ${minutes}m ${seconds}s`
    .replace(/\b0+[a-z]+\s*/gi, '')
    .trim();
}

export function toBigIntOrNumber(value) {
  const parsedValue = parseFloat(value);
  if (Number.isInteger(parsedValue)) {
    return BigInt(value);
  } else {
    return parsedValue;
  }
}

export function _t(number, format = 'MMM D, YYYY · h:mm A') {
  try {
    return dayjs(number * 1000).format(format);
  } catch (e) {
    console.log(e);
    return '';
  }
}

export function _rt(number) {
  try {
    return dayjs(number * 1000).fromNow(false);
  } catch (e) {
    console.log(e);
    return '';
  }
}

export function abiToDefinition(abi: FunctionFragment, chainId?: ChainId) {
  const definition = {
    $async: true,
    title: abi.name,
    type: 'object',
    required: [] as string[],
    additionalProperties: false,
    properties: {}
  };

  abi.inputs.forEach((input, i) => {
    const inputName = input.name ?? `Input ${i + 1}`;

    definition.properties[inputName] = {};
    definition.required.push(inputName);
    let type = 'string';
    if (input.type === 'bool') type = 'boolean';
    if (input.type === 'uint256') {
      definition.properties[inputName].format = 'uint256';
      definition.properties[inputName].examples = ['0'];
    }
    if (input.type === 'int256') {
      definition.properties[inputName].format = 'int256';
      definition.properties[inputName].examples = ['0'];
    }
    if (input.type === 'bytes') {
      definition.properties[inputName].format = 'bytes';
      definition.properties[inputName].examples = ['0x0000…'];
    }
    if (input.type === 'address') {
      definition.properties[inputName].format = 'ens-or-address';
      definition.properties[inputName].examples = ['0x0000…'];
      if (chainId) {
        definition.properties[inputName].chainId = chainId;
      }
    }
    if (input.type.endsWith('[]')) {
      definition.properties[inputName].format = input.type;
      definition.properties[inputName].examples = ['0x0, 0x1'];
    }
    definition.properties[inputName].type = type;
    definition.properties[inputName].title = `${inputName} (${input.type})`;
  });
  return definition;
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

  return Object.fromEntries(entries.filter(([k]) => !keys.includes(k))) as Omit<
    T,
    K
  >;
}

export function uniqBy<T>(arr: T[], predicate: keyof T | ((o: T) => any)): T[] {
  const cb = typeof predicate === 'function' ? predicate : o => o[predicate];

  const pickedObjects = arr
    .filter(item => item)
    .reduce((map, item) => {
      const key = cb(item);

      if (!key) {
        return map;
      }

      return map.has(key) ? map : map.set(key, item);
    }, new Map())
    .values();

  return [...pickedObjects];
}

export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function verifyNetwork(
  web3Provider: Web3Provider,
  chainId: number
) {
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
    if (err.code !== 4902 || !ADDABLE_NETWORKS[chainId]) throw err;

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
      const error = new Error(
        'User rejected network change after it being added'
      );
      (error as any).code = 4001;
      throw error;
    }
  }
}

export async function verifyStarknetNetwork(
  web3: any,
  chainId: starknetConstants.StarknetChainId
) {
  if (!web3.provider.request) return;
  // Skip network switch for Argent Mobile,
  // only SN_MAIN is supported (getting `unknown request` error inside in-built browser)
  if (web3.provider.name === 'Argent Mobile') return;
  try {
    await web3.provider.request({
      type: 'wallet_switchStarknetChain',
      params: {
        chainId
      }
    });
  } catch (e) {
    if (!e.message.toLowerCase().includes('not implemented')) {
      throw new Error(e.message);
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
        chain_id: treasury.chainId,
        address: treasury.address
      })),
      labels: metadata.labels?.map(label => ({
        id: label.id,
        name: label.name,
        description: label.description,
        color: label.color
      })),
      delegations: metadata.delegations.map(delegation => ({
        name: delegation.name,
        api_type: delegation.apiType,
        api_url: delegation.apiUrl,
        contract: delegation.contractAddress,
        chain_id: delegation.chainId
      })),
      ...extraProperties
    }
  };
}

export function compareAddresses(a: string, b: string): boolean {
  if (a.length > 42 && b.length > 42) {
    return validateAndParseAddress(a) === validateAndParseAddress(b);
  }
  return isAddress(a) && isAddress(b) && a.toLowerCase() === b.toLowerCase();
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
  type:
    | 'avatar'
    | 'user-cover'
    | 'space'
    | 'space-cover'
    | 'space-logo'
    | 'token',
  id: string,
  size: number | { width: number; height: number },
  hash?: string,
  cropped?: boolean
) {
  let sizeParam = '';
  if (typeof size === 'number') {
    sizeParam = `?s=${size * 2}`;
  } else {
    sizeParam = `?w=${size.width}&h=${size.height}`;
  }

  const cacheParam = hash ? `&cb=${hash}` : '';
  const cropParam = cropped === false ? `&fit=inside` : '';

  return `https://cdn.stamp.fyi/${type}/${formatAddress(id)}${sizeParam}${cacheParam}${cropParam}`;
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
  try {
    const url = new URL(fullURL);
    return `${url.hostname}${url.pathname.replace(/\/$/, '')}`;
  } catch (error) {
    console.log('Error simplifying URL', error);
    return '';
  }
}

export function getChoiceWeight(
  selectedChoices: Record<string, number>,
  index: number
) {
  const whole = Object.values(selectedChoices).reduce((a, b) => a + b, 0);
  const percent = selectedChoices[index + 1] / whole;

  return isNaN(percent) ? 0 : percent;
}

export function getChoiceText(availableChoices: string[], choice: Choice) {
  if (typeof choice === 'string') {
    const basicChoices = {
      for: 0,
      against: 1,
      abstain: 2
    };

    return basicChoices[choice] !== undefined
      ? availableChoices[basicChoices[choice]]
      : 'Invalid choice';
  }

  if (typeof choice === 'number') {
    return availableChoices[choice - 1] ?? 'Invalid choice';
  }

  if (Array.isArray(choice)) {
    if (!choice.length) return 'Blank vote';
    return choice.map(index => availableChoices[index - 1]).join(', ');
  }

  if (!Object.keys(choice).length) return 'Blank vote';

  const total = Object.values(choice).reduce((acc, weight) => acc + weight, 0);

  return Object.entries(choice)
    .filter(([, weight]) => weight > 0)
    .map(
      ([index, weight]) =>
        `${_p(weight / total)} for ${availableChoices[Number(index) - 1]}`
    )
    .join(', ');
}

export function autoLinkText(text: string) {
  if (!text) return text;

  return Autolinker.link(text, {
    sanitizeHtml: true,
    phone: false,
    replaceFn: match =>
      match.buildTag().setAttr('href', sanitizeUrl(match.getAnchorHref())!)
  });
}

export function getSocialNetworksLink(data: any) {
  return [
    { key: 'external_url', icon: IHGlobeAlt, urlFormat: '$' },
    { key: 'twitter', icon: ICX, urlFormat: 'https://twitter.com/$' },
    { key: 'discord', icon: ICDiscord, urlFormat: 'https://discord.gg/$' },
    {
      key: 'coingecko',
      icon: ICCoingecko,
      urlFormat: 'https://www.coingecko.com/coins/$'
    },
    { key: 'github', icon: ICGithub, urlFormat: 'https://github.com/$' },
    { key: 'lens', icon: ICLens, urlFormat: 'https://hey.xyz/u/$' },
    { key: 'farcaster', icon: ICFarcaster, urlFormat: 'https://warpcast.com/$' }
  ]
    .map(({ key, icon, urlFormat }) => {
      const value = data[key];
      const href = value ? sanitizeUrl(urlFormat.replace('$', value)) : null;

      return href ? { key, icon, href } : {};
    })
    .filter(social => social.href);
}

export function getFormattedVotingPower(votingPower?: VotingPowerItem) {
  if (!votingPower) return;

  const { votingPowers, symbol } = votingPower;
  const value = _vp(
    votingPowers.reduce(
      (acc, b) => acc + Number(b.value) / 10 ** b.cumulativeDecimals,
      0
    )
  );

  return symbol ? `${value} ${symbol}` : value;
}

export function stripHtmlTags(text: string) {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return doc.body.textContent || '';
}

export function whiteLabelAwareParams(
  isWhiteLabel: boolean,
  params: RouteParamsRaw
) {
  if (isWhiteLabel) delete params.space;

  return params;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return { r, g, b };
}

export function getRandomHexColor(): string {
  return `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, '0')}`.toUpperCase();
}

/**
 * Concat a list of strings with the connector if needed,
 * using the oxford comma rule.
 * e.g.
 * - ['a', 'b', 'c'] => 'a, b, and c'
 * - ['a', 'b'] => 'a and b'
 * - ['a'] => 'a'
 */
export function prettyConcat(options: string[], connector = 'or') {
  const uniqOptions = Array.from(new Set(options));

  return uniqOptions.length > 1
    ? `${uniqOptions.slice(0, -1).join(', ')}${uniqOptions.length > 2 ? ',' : ''} ${connector} ${uniqOptions.slice(-1)}`
    : uniqOptions[0];
}

export function isUserAbortError(e: any) {
  return (
    ['ACTION_REJECTED', 4001, 113].includes(e.code) ||
    ['User abort', 'User rejected the request.'].includes(e.message)
  );
}

export async function getSpaceController(id: string, network: NetworkID) {
  const chainMapping = {
    ens: {
      s: 1,
      's-tn': 11155111
    },
    shibarium: {
      s: 109,
      's-tn': 157
    }
  };

  if (id.endsWith('.shib')) {
    const owner = await getOwner(id, chainMapping.shibarium[network]);

    return owner || EMPTY_ADDRESS;
  }

  return getEnsSpaceController(id, chainMapping.ens[network]);
}
