import { SplitUint256 } from '../split-uint256';
import { Choice } from '../choice';

/**
 * Currently there is no way to pass struct types with pointers in calldata, so we must pass the 2d array as a flat array and then reconstruct the type.
 * The structure of the flat array that is output from this function is as follows:
 * flat_array[0] = num_arrays
 * flat_array[1:1+num_arrays] = offsets
 * flat_array[1+num_arrays:] = elements
 * @param array2D The 2d array to flatten
 * @returns The flattened array
 */
export function flatten2DArray(array2D: bigint[][]): bigint[] {
  const flatArray: bigint[] = [];
  const num_arrays = BigInt(array2D.length);
  flatArray.push(num_arrays);
  let offset = BigInt(0);
  flatArray.push(offset);
  for (let i = 0; i < num_arrays - BigInt(1); i++) {
    offset += BigInt(array2D[i].length);
    flatArray.push(offset);
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
  executionHash: string,
  metadataUri: bigint[],
  executorAddress: bigint,
  usedVotingStrategies: bigint[],
  usedVotingStrategyParams: bigint[][],
  executionParams: bigint[]
): bigint[] {
  const executionHashUint256 = SplitUint256.fromHex(executionHash);
  const usedVotingStrategyParamsFlat = flatten2DArray(usedVotingStrategyParams);
  return [
    BigInt(proposerAddress),
    executionHashUint256.low,
    executionHashUint256.high,
    BigInt(metadataUri.length),
    ...metadataUri,
    executorAddress,
    BigInt(usedVotingStrategies.length),
    ...usedVotingStrategies,
    BigInt(usedVotingStrategyParamsFlat.length),
    ...usedVotingStrategyParamsFlat,
    BigInt(executionParams.length),
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
  proposalID: bigint,
  choice: Choice,
  usedVotingStrategies: bigint[],
  usedVotingStrategyParams: bigint[][]
): bigint[] {
  const usedVotingStrategyParamsFlat = flatten2DArray(usedVotingStrategyParams);
  return [
    BigInt(voterAddress),
    proposalID,
    BigInt(choice),
    BigInt(usedVotingStrategies.length),
    ...usedVotingStrategies,
    BigInt(usedVotingStrategyParamsFlat.length),
    ...usedVotingStrategyParamsFlat
  ];
}
