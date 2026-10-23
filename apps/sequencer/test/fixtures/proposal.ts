import db from '../../src/helpers/mysql';

// Mock return results from SQL
const ProposalsSqlFixtures: Record<string, any>[] = [
  {
    id: '0x01',
    ipfs: '1234',
    author: '0x91FD2c8d24767db4Ece7069AA27832ffaf8590f3',
    created: 1688788535,
    space: 'test.eth',
    network: '1',
    symbol: 'VOTE',
    type: 'single-choice',
    strategies: {},
    validation: {},
    plugins: {},
    title: 'My first proposal',
    body: 'Hello world',
    discussion: '',
    choices: {},
    start: 1688788535,
    end: 1689047735,
    quorum: 0,
    privacy: '',
    snapshot: 9310476,
    app: 'snapshot',
    scores: {},
    scores_by_strategy: {},
    scores_state: '',
    scores_total: 0,
    scores_updated: 0,
    votes: 0,
    flagged: 0
  }
];

export default ProposalsSqlFixtures;

/**
 * Inserts a proposal row for integration tests, replacing any row with the same
 * id. The defaults are a public basic proposal; pass the fields that matter.
 */
export async function insertProposal(
  overrides: Record<string, any> & { id: string }
): Promise<void> {
  await db.queryAsync('DELETE FROM proposals WHERE id = ?', [overrides.id]);
  await db.queryAsync('INSERT INTO proposals SET ?', {
    ipfs: `bafkrei${overrides.id.slice(-12)}`,
    author: '0xFC01614d28595d9ea5963daD9f44C0E0F0fE10f0',
    created: 1,
    space: 'test.eth',
    network: '1',
    symbol: '',
    type: 'basic',
    strategies: '[]',
    validation: '{}',
    plugins: '{}',
    title: 'fixture',
    body: '',
    discussion: '',
    choices: JSON.stringify(['Yes', 'No']),
    start: 1,
    end: 2_000_000_000,
    quorum: 0,
    privacy: '',
    snapshot: 1,
    app: '',
    scores: '[]',
    scores_by_strategy: '[]',
    scores_state: 'pending',
    scores_total: 0,
    scores_updated: 0,
    vp_value_by_strategy: '[]',
    votes: 0,
    ...overrides
  });
}
