import { defaultProvider as provider } from 'starknet';
import mysql from './mysql';
import { wait } from './utils';

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
    console.log(block.block_number, block.block_hash, block.status);
    // const query = 'SELECT * FROM blocks WHERE hash = ? LIMIT 1';
    // const parentBlocks = await mysql.queryAsync(query, [block.parent_block_hash]);
    // if (parentBlocks[0] || [0].includes(block.block_number)) return;
    if ([0].includes(block.block_number)) return;
    return next(block.parent_block_hash);
  } catch (e) {
    console.log('Get block failed', blockHash, JSON.stringify(e).slice(0, 256));
    await wait(12e3);
    return next(blockHash);
  }
}

async function watch() {
  console.log('Watch');
  await next();
  await wait(6e3);
  return await watch();
}

async function start() {
  console.log('Start');
  const query = 'SELECT * FROM blocks ORDER BY number ASC LIMIT 1';
  const minBlocks = await mysql.queryAsync(query);
  if (minBlocks[0] && minBlocks[0].number !== 0) {
    console.log('Continue from block', minBlocks[0].number);
    return await next(minBlocks[0].hash);
  } else {
    console.log('Start from current block');
    return await watch();
  }
}

start();
