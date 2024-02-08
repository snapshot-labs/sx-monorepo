import { CairoCustomEnum } from 'starknet';

export function getChoiceEnum(choice: 0 | 1 | 2) {
  return new CairoCustomEnum({
    Against: choice === 0 ? 0 : undefined,
    For: choice === 1 ? 1 : undefined,
    Abstain: choice === 2 ? 2 : undefined
  });
}

export function getUserAddressEnum(type: 'ETHEREUM' | 'STARKNET' | 'CUSTOM', address: string) {
  return new CairoCustomEnum({
    Starknet: type === 'STARKNET' ? address : undefined,
    Ethereum: type === 'ETHEREUM' ? address : undefined,
    Custom: type === 'CUSTOM' ? address : undefined
  });
}
