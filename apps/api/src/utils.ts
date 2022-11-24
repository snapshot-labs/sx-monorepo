import fetch from 'node-fetch';
import { hash } from 'starknet';
import { faker } from '@faker-js/faker';
import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { SplitUint256 } from '@snapshot-labs/sx/dist/utils/split-uint256';

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

export function getEvent(data: string[], format: string) {
  const params = format.split(',').map(param => param.trim());
  const event = {};
  let len = 0;
  let skip = 0;
  params.forEach((param, i) => {
    const name = param.replace('(uint256)', '').replace('(felt)', '').replace('(felt*)', '');
    const next = i + skip;
    if (len > 0) {
      event[name] = data.slice(next, next + len);
      skip += len - 1;
      len = 0;
    } else {
      if (param.endsWith('(uint256)')) {
        const uint256 = data.slice(next, next + 2);
        event[name] = new SplitUint256(uint256[0], uint256[1]).toUint().toString();
        skip += 1;
      } else {
        event[name] = data[next];
      }
    }
    if (param.endsWith('_len')) len = parseInt(BigInt(data[next]).toString());
  });
  return event;
}

export function getSpaceName(address) {
  const seed = parseInt(hash.getSelectorFromName(address).toString().slice(0, 12));
  faker.seed(seed);
  const noun = faker.word.noun(6);
  return `${noun.charAt(0).toUpperCase()}${noun.slice(1)} DAO`;
}
