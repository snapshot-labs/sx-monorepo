import fetch from 'node-fetch';
import { hash } from 'starknet';
import { faker } from '@faker-js/faker';
import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';

export function toAddress(bn) {
  try {
    return getAddress(BigNumber.from(bn).toHexString());
  } catch (e) {
    return bn;
  }
}

export function getUrl(uri, gateway = 'pineapple.fyi') {
  const ipfsGateway = `https://${gateway}`;
  if (!uri) return null;
  if (
    !uri.startsWith('ipfs://') &&
    !uri.startsWith('ipns://') &&
    !uri.startsWith('https://') &&
    !uri.startsWith('http://')
  )
    return `${ipfsGateway}/ipfs/${uri}`;
  const uriScheme = uri.split('://')[0];
  if (uriScheme === 'ipfs') return uri.replace('ipfs://', `${ipfsGateway}/ipfs/`);
  if (uriScheme === 'ipns') return uri.replace('ipns://', `${ipfsGateway}/ipns/`);
  return uri;
}

export async function getJSON(uri) {
  const url = getUrl(uri);
  return fetch(url).then(res => res.json());
}

export function getSpaceName(address) {
  const seed = parseInt(hash.getSelectorFromName(address).toString().slice(0, 12));
  faker.seed(seed);
  const noun = faker.word.noun(6);
  return `${noun.charAt(0).toUpperCase()}${noun.slice(1)} DAO`;
}

export function parseTimestamps(timestamps: string) {
  const result = timestamps.replace('0x', '').match(/.{8}/g);
  if (!result) return null;

  const [snapshot, start, minEnd, maxEnd] = result.map(timestamp => parseInt(`0x${timestamp}`, 16));

  return { snapshot, start, minEnd, maxEnd };
}
