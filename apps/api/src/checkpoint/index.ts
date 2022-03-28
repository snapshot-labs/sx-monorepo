import { Provider } from 'starknet';
import { starknetKeccak } from 'starknet/utils/hash';
import { validateAndParseAddress } from 'starknet/utils/address';
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
  public checkpoints: number[];

  constructor(config, writer, schema, checkpoints) {
    this.config = config;
    this.writer = writer;
    this.schema = schema;
    this.graphql = getGraphQL(schema);
    this.provider = new Provider({ network: this.config.network });
    this.checkpoints = checkpoints;
  }

  async getStartBlockNum() {
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
    const blockNum = await this.getStartBlockNum();
    return await this.next(blockNum);
  }

  async next(blockNum: number) {
    const cps = this.checkpoints.filter(cp => cp >= blockNum);
    if (cps.length > 0) blockNum = cps[0];
    let block: any;
    console.log('Next', blockNum);
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
      const contract = validateAndParseAddress(source.contract);

      if (contract === validateAndParseAddress(tx.contract_address)) {
        if (tx.type === 'DEPLOY' && source.deploy_fn) {
          console.log('Deploy for', source.contract, tx.type);
          await this.writer[source.deploy_fn]({ source, block, tx, receipt });
        }
      }

      for (const event of receipt.events) {
        if (contract === validateAndParseAddress(event.from_address)) {
          for (const sourceEvent of source.events) {
            if (`0x${starknetKeccak(sourceEvent.name).toString('hex')}` === event.keys[0]) {
              console.log('Event', sourceEvent.name, 'for', contract);
              await this.writer[sourceEvent.fn]({ source, block, tx, receipt });
            }
          }
        }
      }
    }
    // console.log('Handle tx done', tx.transaction_index);
  }

  async reset() {
    console.log('Reset');
    await mysql.queryAsync(toSql(this.schema));
  }
}
