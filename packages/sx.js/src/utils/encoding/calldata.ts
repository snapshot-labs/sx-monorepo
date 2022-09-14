import { Choice } from '../choice';
import { IntsSequence } from '../ints-sequence';

/**
 * Currently there is no way to pass struct types with pointers in calldata, so we must pass the 2d array as a flat array and then reconstruct the type.
 * The structure of the flat array that is output from this function is as follows:
 * flat_array[0] = num_arrays
 * flat_array[1:1+num_arrays] = offsets
 * flat_array[1+num_arrays:] = elements
 * @param array2D The 2d array to flatten
 * @returns The flattened array
 */
export function flatten2DArray(array2D: string[][]): string[] {
  const flatArray: string[] = [];
  const numArrays = `0x${array2D.length.toString(16)}`;
  flatArray.push(numArrays);
  let offset = 0;
  flatArray.push('0x0'); // offset of first array
  for (let i = 0; i < array2D.length - 1; i++) {
    offset += array2D[i].length;
    flatArray.push(`0x${offset.toString(16)}`);
  }
  const elements = array2D.reduce((accumulator, value) => accumulator.concat(value), []);
  return flatArray.concat(elements);
}

/**
 * Generates a calldata array for creating a proposal through an authenticator
 * @param proposerAddress The address of the proposal creator
 * @param executionHash The hash of the proposal execution
 * @param metadataUri The URI address of the proposal
 * @param executorAddress The address of the execution strategy that is used in the proposal
 * @param usedVotingStrategies An array of the voting strategy addresses that are used in the proposal
 * @param usedVotingStrategyParams An array of arrays containing the parameters corresponding to the voting strategies used
 * @param executionParams An array of the execution parameters used
 * @returns Calldata array
 */
export function getProposeCalldata(
  proposerAddress: string,
  metadataUri: IntsSequence,
  executorAddress: string,
  usedVotingStrategies: number[],
  usedVotingStrategyParams: string[][],
  executionParams: string[]
): string[] {
  const usedVotingStrategyParamsFlat = flatten2DArray(usedVotingStrategyParams);
  return [
    proposerAddress,
    `0x${metadataUri.bytesLength.toString(16)}`,
    `0x${metadataUri.values.length.toString(16)}`,
    ...metadataUri.values,
    executorAddress,
    `0x${usedVotingStrategies.length.toString(16)}`,
    ...usedVotingStrategies.map((strategy) => `0x${strategy.toString(16)}`),
    `0x${usedVotingStrategyParamsFlat.length.toString(16)}`,
    ...usedVotingStrategyParamsFlat,
    `0x${executionParams.length.toString(16)}`,
    ...executionParams
  ];
}

/**
 * Generates a calldata array for casting a vote through an authenticator
 * @param voterAddress The address of the proposal creator
 * @param proposalID The ID of the proposal
 * @param choice The choice of the voter (For, Against, Abstain)
 * @param usedVotingStrategies An array of the voting strategy addresses that are used in the proposal
 * @param usedVotingStrategyParams An array of arrays containing the parameters corresponding to the voting strategies used
 * @returns Calldata array
 */
export function getVoteCalldata(
  voterAddress: string,
  proposalID: number,
  choice: Choice,
  usedVotingStrategies: number[],
  usedVotingStrategyParams: string[][]
): string[] {
  const usedVotingStrategyParamsFlat = flatten2DArray(usedVotingStrategyParams);
  return [
    voterAddress,
    `0x${proposalID.toString(16)}`,
    `0x${choice.toString(16)}`,
    `0x${usedVotingStrategies.length.toString(16)}`,
    ...usedVotingStrategies.map((strategy) => `0x${strategy.toString(16)}`),
    `0x${usedVotingStrategyParamsFlat.length.toString(16)}`,
    ...usedVotingStrategyParamsFlat
  ];
}
