import Common, { Chain, Hardfork } from '@ethereumjs/common';
import blockFromRpc from '@ethereumjs/block/dist/from-rpc';
import { IntsSequence } from '../ints-sequence';
import { hexToBytes } from '../bytes';

export interface ProcessBlockInputs {
  blockNumber: number;
  blockOptions: number;
  headerInts: IntsSequence;
}

/**
 * Produces the input data for the process_block function in Fossil
 * @param block Block object from RPC call
 * @param chain EVM chain identifier
 * @param hardfork Hardfork identifier
 * @returns ProcessBlockInputs object
 */
export function getProcessBlockInputs(
  block: any,
  chain: Chain = Chain.Mainnet,
  hardfork: Hardfork = Hardfork.London
): ProcessBlockInputs {
  block.difficulty = `0x${BigInt(block.difficulty).toString(16)}`;
  block.totalDifficulty = `0x${BigInt(block.totalDifficulty).toString(16)}`;
  const common = new Common({ chain: chain, hardfork: hardfork });
  const header = blockFromRpc(block, [], { common }).header;
  const headerRlp = `0x${header.serialize().toString('hex')}`;
  const headerInts = IntsSequence.fromBytes(hexToBytes(headerRlp));
  return {
    blockNumber: block.number as number,
    blockOptions: 8 as number,
    headerInts: headerInts as IntsSequence
  };
}
