import constants from './constants';

export function getAuthenticatorType(address: string): 'vanilla' | 'ethSig' | null {
  const type = constants.authenticators[address];

  if (type !== 'vanilla' && type !== 'ethSig') return null;
  return type;
}

export function getStrategyType(address: string): 'vanilla' | 'singleSlotProof' | null {
  const type = constants.strategies[address];

  if (type !== 'vanilla' && type !== 'singleSlotProof') return null;
  return type;
}
