import { getCreate2Address } from '@ethersproject/address';
import { keccak256 } from '@ethersproject/keccak256';

export function predictCloneAddress(implementation: string, deployer: string, salt: string) {
  const bytecode = keccak256(
    `0x3d602d80600a3d3981f3363d3d373d3d3d363d73${implementation.replace('0x', '').toLowerCase()}5af43d82803e903d91602b57fd5bf3`
  );

  return getCreate2Address(deployer, salt, bytecode);
}
