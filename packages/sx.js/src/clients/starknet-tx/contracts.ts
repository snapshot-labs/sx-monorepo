import constants from './constants';

export function getStrategyType(address: string): 'vanilla' | 'singleSlotProof' | null {
  const type = constants.strategies[address];

  if (type !== 'vanilla' && type !== 'singleSlotProof') return null;
  return type;
}
