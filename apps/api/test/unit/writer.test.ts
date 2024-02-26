import { describe, it, expect } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import Checkpoint, { CheckpointWriter, AsyncMySqlPool } from '@snapshot-labs/checkpoint';
import { validateAndParseAddress } from 'starknet';

type Block = Parameters<CheckpointWriter>[0]['block'];
type Transaction = Parameters<CheckpointWriter>[0]['tx'];

const handleDeploy: CheckpointWriter = async ({ source, block, tx, mysql }) => {
  if (!source || !block) return;

  console.log('Handle deploy');
  const item = {
    id: validateAndParseAddress(source.contract),
    name: 'Pistachio DAO',
    voting_delay: 3600,
    voting_period: 86400,
    proposal_threshold: 1,
    proposal_count: 0,
    vote_count: 0,
    created: block.timestamp,
    tx: tx.transaction_hash
  };
  const query = `INSERT IGNORE INTO spaces SET ?;`;
  await mysql.queryAsync(query, [item]);
};

describe('handleDeploy', () => {
  it('should create space with correct parameters', async () => {
    // TODO: Replace inputs with typed mocks

    const source = {
      contract: '0x0625dc1290b6e936be5f1a3e963cf629326b1f4dfd5a56738dea98e1ad31b7f',
      start: 1,
      events: []
    };

    const block = mockDeep<Block>({
      timestamp: 1652650963200
    });
    const tx = mockDeep<Transaction>({
      transaction_hash: '0xabbb5161c49978ffc76369df76cdb40683e33c09145a9681553fe8e9c9a96a46'
    });
    const mockInstance = mockDeep<Checkpoint>();
    const mockMysql = mockDeep<AsyncMySqlPool>();

    await handleDeploy({
      source,
      block,
      blockNumber: 0,
      pg: null,
      instance: mockInstance,
      tx,
      mysql: mockMysql
    });

    expect(mockMysql.queryAsync.mock.calls).toMatchSnapshot();
  });
});
