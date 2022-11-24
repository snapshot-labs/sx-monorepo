import { mockDeep } from 'jest-mock-extended';
import { AsyncMySqlPool } from '@snapshot-labs/checkpoint';
import { validateAndParseAddress } from 'starknet';

async function handleDeploy({ source, block, tx, mysql }) {
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
}

describe('handleDeploy', () => {
  it('should create space with correct parameters', async () => {
    // TODO: Replace inputs with typed mocks

    const source = {
      contract: '0x0625dc1290b6e936be5f1a3e963cf629326b1f4dfd5a56738dea98e1ad31b7f'
    };

    const block = {
      timestamp: 1652650963200
    };

    const tx = {
      transaction_hash: '0xabbb5161c49978ffc76369df76cdb40683e33c09145a9681553fe8e9c9a96a46'
    };

    const mockMysql = mockDeep<AsyncMySqlPool>();

    await handleDeploy({
      source,
      block,
      tx,
      mysql: mockMysql
    });

    expect(mockMysql.queryAsync.mock.calls).toMatchSnapshot();
  });
});
