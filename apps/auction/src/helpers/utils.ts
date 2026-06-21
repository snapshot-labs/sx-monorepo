import { getAddress, isAddress } from '@ethersproject/address';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import updateLocale from 'dayjs/plugin/updateLocale';
import sha3 from 'js-sha3';
import { validateAndParseAddress } from 'starknet';
import { MAX_SYMBOL_LENGTH } from './constants';
import pkg from '@/../package.json';

const IPFS_GATEWAY: string =
  import.meta.env.VITE_IPFS_GATEWAY || 'https://cloudflare-ipfs.com';

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

export function _c(value: string | bigint, decimals = 18) {
  const raw = BigInt(value);
  const parsed = Number(raw) / 10 ** decimals;
  if (raw !== 0n && parsed < 0.001) return `~0`;

  const formatter = new Intl.NumberFormat('en', { maximumFractionDigits: 3 });
  return formatter.format(parsed);
}

export function _p(value: number, maximumFractionDigits = 2) {
  const formatter = new Intl.NumberFormat('en', {
    style: 'percent',
    maximumFractionDigits
  });
  return formatter.format(value);
}

function jsonParse(input: string | null, fallback?: any) {
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

function partitionDuration(s: number) {
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

  return {
    days,
    hours,
    minutes,
    seconds
  };
}

export function _d(s: number): string {
  const { days, hours, minutes, seconds } = partitionDuration(s);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`
    .replace(/\b0+[a-z]+\s*/gi, '')
    .trim();
}

export function _t(number: number | string, format = 'MMM D, YYYY · h:mm A') {
  try {
    return dayjs(Number(number) * 1000).format(format);
  } catch (err) {
    console.log(err);
    return '';
  }
}

export function _rt(time: number, withoutSuffix = false) {
  try {
    return dayjs(time * 1000).fromNow(withoutSuffix);
  } catch (err) {
    console.log(err);
    return '';
  }
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

export function compareAddresses(a: string, b: string): boolean {
  if (a.length > 42 && b.length > 42) {
    return validateAndParseAddress(a) === validateAndParseAddress(b);
  }
  return isAddress(a) && isAddress(b) && a.toLowerCase() === b.toLowerCase();
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

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);

  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function loadImageFromIpfs(ipfsUrl: string): Promise<File> {
  const imageUrl = getUrl(ipfsUrl);
  if (!imageUrl) {
    throw new Error('Unable to resolve IPFS URL');
  }

  const response = await fetch(imageUrl);
  const blob = await response.blob();
  return new File([blob], 'image', { type: blob.type });
}

export async function resizeImage(
  file: File,
  width: number,
  height: number
): Promise<File> {
  const img = await loadImageFromFile(file);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const scaleX = width / img.width;
  const scaleY = height / img.height;
  const scale = Math.max(scaleX, scaleY);

  const scaledWidth = img.width * scale;
  const scaledHeight = img.height * scale;

  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = img.width;
  let sourceHeight = img.height;

  if (scaledWidth > width) {
    const cropWidth = width / scale;
    sourceX = (img.width - cropWidth) / 2;
    sourceWidth = cropWidth;
  }

  if (scaledHeight > height) {
    const cropHeight = height / scale;
    sourceY = (img.height - cropHeight) / 2;
    sourceHeight = cropHeight;
  }

  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  ctx.drawImage(
    img,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height
  );

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Failed to convert canvas to blob'));
        return;
      }

      const resizedFile = new File([blob], file.name, {
        type: file.type,
        lastModified: Date.now()
      });

      resolve(resizedFile);
    }, file.type);
  });
}

export function isUserAbortError(err: any) {
  return (
    ['ACTION_REJECTED', 4001, 113].includes(err.code) ||
    ['User abort', 'User rejected the request.'].includes(err.message)
  );
}

export function getUserFacingErrorMessage(
  err: unknown,
  fallback: string = 'Something went wrong. Please try again later.'
): string {
  return (err instanceof Error && err.message) || fallback;
}
