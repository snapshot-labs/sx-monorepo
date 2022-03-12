import { Provider } from 'starknet';
import { starknetKeccak } from 'starknet/utils/hash';
import Promise from 'bluebird';
import mysql from './mysql';
import { toSql } from './graphql/utils';
import getGraphQL from './graphql';

export default class Checkpoint {
  public config;
  public writer;
  public schema;
  public graphql;
  public provider: Provider;

  constructor(config, writer, schema) {
    this.config = config;
    this.writer = writer;
    this.schema = schema;
    this.graphql = getGraphQL(schema);
    this.provider = new Provider({ network: this.config.network });
  }

  async getStartBlock() {
    let start = 0;
    const lastBlock = await mysql.queryAsync('SELECT * FROM checkpoint LIMIT 1');
    const nextBlock = lastBlock[0].number + 1;
    this.config.sources.forEach(source => {
      start = start === 0 || start > source.start ? source.start : start;
    });
    return nextBlock > start ? nextBlock : start;
  }

  async start() {
    console.log('Start');
    const nextBlock = await this.getStartBlock();
    return await this.next(nextBlock);
  }

  async next(blockNum: number) {
    let block: any;
    try {
      block = await this.provider.getBlock(blockNum);
    } catch (e) {
      console.log('Get block failed', blockNum, JSON.stringify(e).slice(0, 256));
      await Promise.delay(12e3);
      return this.next(blockNum);
    }
    await this.handleBlock(block);
    const query = 'UPDATE checkpoint SET number = ?';
    await mysql.queryAsync(query, [block.block_number]);
    return this.next(blockNum + 1);
  }

  async handleBlock(block) {
    console.log('Handle block', block.block_number);
    for (const receipt of block.transaction_receipts)
      await this.handleTx(block, block.transactions[receipt.transaction_index], receipt);
    // console.log('Handle block done', block.block_number);
  }

  async handleTx(block, tx, receipt) {
    // console.log('Handle tx', tx.transaction_index);
    for (const source of this.config.sources) {
      let contract = source.contract;
      contract = contract.length === 66 ? `0x${contract.slice(3)}` : contract;
      if (contract === tx.contract_address) await this.action(source, block, tx, receipt);
    }
    // console.log('Handle tx done', tx.transaction_index);
  }

  async action(source, block, tx, receipt) {
    console.log('Action for', source.contract, tx.type);
    console.log('Events', receipt.events.length);
    if (tx.type === 'DEPLOY' && source.deploy_fn)
      await this.writer[source.deploy_fn]({ source, block, tx, receipt });
    for (const sourceEvent of source.events) {
      for (const event of receipt.events) {
        if (starknetKeccak(sourceEvent.name).toString() === event.keys[0])
          await this.writer[sourceEvent.fn]({ source, block, tx, receipt });
      }
    }
  }

  async reset() {
    console.log('Reset');
    await mysql.queryAsync(toSql(this.schema));
  }
}
