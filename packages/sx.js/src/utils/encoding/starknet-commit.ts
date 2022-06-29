import { toBN } from 'starknet/dist/utils/number';
import { hash } from 'starknet';

const { computeHashOnElements } = hash;

/**
 * Computes the Pedersen hash of a execution payload for StarkNet
 * This can be used to produce the input for calling the commit method in the StarkNet Commit contract.
 * @param target the target address of the execution
 * @param selector the selector for the method at address target one wants to execute
 * @param calldata the payload for the method at address target one wants to execute
 * @returns A Pedersen hash of the data as a Big Int
 */
export function getCommit(target: bigint, selector: bigint, calldata: bigint[]): bigint {
  const targetBigNum = toBN(`0x${target.toString(16)}`);
  const selectorBigNum = toBN(`0x${selector.toString(16)}`);
  const calldataBigNum = calldata.map((x) => toBN(`0x${x.toString(16)}`));
  return BigInt(computeHashOnElements([targetBigNum, selectorBigNum, ...calldataBigNum]));
}
