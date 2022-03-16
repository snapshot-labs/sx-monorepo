import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';

export function toAddress(bn) {
  try {
    return getAddress(BigNumber.from(bn).toHexString());
  } catch (e) {
    return bn;
  }
}

export function getSNAddress(address: string) {
  if (address.length === 65) return `0x0${address.slice(2)}`;
  return address;
}
