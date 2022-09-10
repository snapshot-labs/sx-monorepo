import vanillaStrategy from './vanilla';
import singleSlotProofStrategy from './singleSlotProof';
import type { Strategy } from '../types';

const strategies = {
  '0x344a63d1f5cd0e5f707fede9886d5dd306e86eba91ea410b416f39e44c3865': vanillaStrategy,
  '0x4bbd8081b1e9ef84ee2a767ef2cdcdea0dd8298b8e2858afa06bed1898533e6': singleSlotProofStrategy
};

export function getStrategy(address: string): Strategy | null {
  const authenticator = strategies[address];
  if (!authenticator) return null;

  return authenticator;
}
