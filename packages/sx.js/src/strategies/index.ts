import vanillaStrategy from './vanilla';
import singleSlotProofStrategy from './singleSlotProof';
import * as utils from '../utils';
import type { Strategy } from '../types';

const strategies = {
  '0x0515fbfa25bcf1e9419cdb8886cb8878d2705cdd2be8cf434675e19314b89d71': vanillaStrategy,
  '0x068da98d7798439f16b63b61644e7b27c932d5c051a455a978aa95488d5dcc9b': singleSlotProofStrategy
};

export function getStrategy(address: string): Strategy | null {
  const strategy = strategies[utils.encoding.hexPadRight(address)];
  if (!strategy) return null;

  return strategy;
}
