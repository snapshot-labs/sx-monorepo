import { defaultProvider as provider } from 'starknet';
import mysql from './mysql';
import { sleep } from './utils';

async function next(blockHash?: string) {
  try {
    const block: any = await provider.getBlock(blockHash);
    const params = [
      {
        number: block.block_number,
        hash: block.block_hash
      }
    ];
    await mysql.queryAsync('INSERT IGNORE INTO blocks SET ?', params);
    console.log(block.block_number, block.block_hash, block.parent_block_hash, block.status);
    if (![0, 1].includes(block.block_number)) next(block.parent_block_hash);
  } catch (e) {
    console.log('Get block failed', blockHash, JSON.stringify(e).slice(0, 256));
    await sleep(3e3);
    next(blockHash);
  }
}

async function start() {
  console.log('Start');
  const lastBlocks = await mysql.queryAsync('SELECT * FROM blocks ORDER BY number ASC LIMIT 1');
  if (lastBlocks[0]) {
    console.log('Continue from block', lastBlocks[0].number);
    await next(lastBlocks[0].hash);
  } else {
    console.log('Start from current block');
    await next();
  }
}

start();
