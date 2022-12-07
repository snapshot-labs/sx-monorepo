import createVanillaStrategy from './vanilla';
import createSingleSlotProofStrategy from './singleSlotProof';
import * as utils from '../utils';
import type { Strategy, NetworkConfig } from '../types';

export function getStrategy(address: string, networkConfig: NetworkConfig): Strategy | null {
  const strategy = networkConfig.strategies[utils.encoding.hexPadLeft(address)];
  if (!strategy) return null;

  if (strategy.type === 'vanilla') {
    return createVanillaStrategy();
  }

  if (strategy.type === 'singleSlotProof') {
    return createSingleSlotProofStrategy(strategy.params);
  }

  return null;
}
