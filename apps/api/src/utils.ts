import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';

export function feltToString(events) {
  if (!events || events.length < 1 || !events[0].data || events[0].data.length < 8) return '';
  const str = events[0].data
    .slice(5, 7)
    .map(str => BigInt(str).toString(16))
    .join('');
  return `0x${str}`;
}

export function toAddress(bn) {
  try {
    return getAddress(BigNumber.from(bn).toHexString());
  } catch (e) {
    return bn;
  }
}
