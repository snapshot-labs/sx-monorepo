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
