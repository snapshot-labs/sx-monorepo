import { faker } from '@faker-js/faker';
import fetch from 'cross-fetch';
import { hash } from 'starknet';
import { getUrl } from './starknet/utils';

export function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

export function dropIpfs(metadataUri: string) {
  return metadataUri.replace('ipfs://', '');
}

export function getSpaceName(address: string) {
  const seed = parseInt(
    hash.getSelectorFromName(address).toString().slice(0, 12)
  );
  faker.seed(seed);
  const noun = faker.word.noun(6);
  return `${noun.charAt(0).toUpperCase()}${noun.slice(1)} DAO`;
}

export async function getJSON(uri: string) {
  const url = getUrl(uri);
  if (!url) throw new Error('Invalid URI');

  return fetch(url).then(res => res.json());
}
