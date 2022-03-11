import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';

export function toAddress(bn) {
  try {
    return getAddress(BigNumber.from(bn).toHexString());
  } catch (e) {
    return bn;
  }
}
