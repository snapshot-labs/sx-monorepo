import vanillaStrategy from './vanilla';
import singleSlotProofStrategy from './singleSlotProof';
import * as utils from '../utils';
import type { Strategy } from '../types';

const defaultStrategies = {
  '0x058623786b93d9b6ed1f83cec5c6fa6bea5f399d2795ee56a6123bdd83f5aa48': vanillaStrategy,
  '0x00d1b81feff3095ca9517fdfc7427e742ce96f7ca8f3b2664a21b2fba552493b': singleSlotProofStrategy
};

export function getStrategy(address: string, strategies: any = defaultStrategies): Strategy | null {
  const strategy = strategies[utils.encoding.hexPadLeft(address)];
  if (!strategy) return null;

  return strategy;
}
