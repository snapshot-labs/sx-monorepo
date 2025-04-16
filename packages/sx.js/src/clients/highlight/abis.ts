import { Interface } from '@ethersproject/abi';

export const ALIASES_ADDRESS = '0x0000000000000000000000000000000000000001';
export const ALIASES_ABI = [
  'function setAlias(address from, address alias, uint256 salt, bytes signature)'
];

const aliasesInterface = new Interface(ALIASES_ABI);

export function encodeSetAlias(
  from: string,
  alias: string,
  salt: bigint,
  signature: string
): string {
  return aliasesInterface.encodeFunctionData('setAlias', [
    from,
    alias,
    salt,
    signature
  ]);
}
