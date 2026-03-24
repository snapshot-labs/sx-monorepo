import fs from 'fs';
import path from 'path';
import { CheckpointConfig } from '@snapshot-labs/checkpoint';
import { PosterAbi } from './abi';

const POSTER_CONTRACT = '0x000000000000cd17345801aa8147b8D3950260FF';
const NETWORK_NODE_URL =
  process.env.NETWORK_NODE_URL || 'http://127.0.0.1:8545';

export function getStartBlock(): number {
  if (process.env.POSTER_START_BLOCK) {
    return parseInt(process.env.POSTER_START_BLOCK);
  }

  // Read from the state file written by reset-anvil.mjs
  try {
    const stateFile = path.join(__dirname, '../../.anvil-start-block');
    const blockNum = parseInt(fs.readFileSync(stateFile, 'utf8').trim());
    if (!isNaN(blockNum)) return blockNum;
  } catch {
    // file doesn't exist
  }

  return 1;
}

export function createConfig(startBlock: number): CheckpointConfig {
  return {
    network_node_url: NETWORK_NODE_URL,
    sources: [
      {
        contract: POSTER_CONTRACT,
        start: startBlock,
        abi: 'Poster',
        events: [
          {
            name: 'NewPost(address,string,string)',
            fn: 'handleNewPost'
          }
        ]
      }
    ],
    abis: {
      Poster: PosterAbi
    }
  };
}
