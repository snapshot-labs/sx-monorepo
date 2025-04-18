import { Interface } from '@ethersproject/abi';

export const ALIASES_ADDRESS = '0x0000000000000000000000000000000000000001';
export const ALIASES_ABI = [
  'function setAlias(uint chainId, bytes32 salt, address from, address alias, bytes signature)'
];

const aliasesInterface = new Interface(ALIASES_ABI);

export function encodeSetAlias(
  chainId: number,
  salt: bigint,
  from: string,
  alias: string,
  signature: string
): string {
  return aliasesInterface.encodeFunctionData('setAlias', [
    chainId,
    `0x${salt.toString(16)}`,
    from,
    alias,
    signature
  ]);
}
