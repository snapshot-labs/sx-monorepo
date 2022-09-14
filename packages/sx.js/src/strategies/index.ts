import vanillaStrategy from './vanilla';
import singleSlotProofStrategy from './singleSlotProof';
import * as utils from '../utils';
import type { Strategy } from '../types';

const strategies = {
  '0x07cccf8ea8e940a4728182a4c05423c0148a805aeba3e6c43bed9743acd6d09b': vanillaStrategy,
  '0x068da98d7798439f16b63b61644e7b27c932d5c051a455a978aa95488d5dcc9b': singleSlotProofStrategy
};

export function getStrategy(address: string): Strategy | null {
  const authenticator = strategies[utils.encoding.hexPadRight(address)];
  if (!authenticator) return null;

  return authenticator;
}
