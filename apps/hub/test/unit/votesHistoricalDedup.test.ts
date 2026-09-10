import { parse } from 'graphql';
import fetchVotes from '../../src/graphql/operations/votes';
import db from '../../src/helpers/mysql';

jest.mock('../../src/helpers/mysql', () => ({
  __esModule: true,
  default: { queryAsync: jest.fn() }
}));

jest.mock('../../src/helpers/metrics', () => ({
  requestDeduplicatorSize: { set: jest.fn() }
}));

const queryAsync = db.queryAsync as jest.Mock;
const CUTOFF = 1700000000;

function proposalInfo() {
  const document: any = parse('query { votes { id proposal { id } } }');
  const operation: any = document.definitions[0];
  return {
    fieldNodes: [operation.selectionSet.selections[0]],
    fragments: {},
    variableValues: {}
  };
}

function voteRow() {
  return {
    id: 'vote-1',
    ipfs: 'ipfs-1',
    voter: '0x0000000000000000000000000000000000000001',
    space: 'example.eth',
    proposal: 'proposal-1',
    reason: '',
    app: 'snapshot',
    created: CUTOFF,
    vp: 1,
    vp_state: 'final',
    vp_value: 1,
    choice: '1',
    metadata: '{}',
    vp_by_strategy: '[]',
    settings: '{}'
  };
}

function context() {
  return {
    historicalAccess: {
      mode: 'enforce',
      cutoff: CUTOFF,
      keyState: 'anonymous',
      isEntitled: false,
      onGated: jest.fn(),
      onRestricted: jest.fn()
    }
  };
}

describe('votes historical deduplication', () => {
  beforeEach(() => queryAsync.mockReset());

  it('marks every concurrent caller when nested proposals are restricted', async () => {
    let release: (rows: any[]) => void = () => undefined;
    queryAsync
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            release = resolve;
          })
      )
      .mockResolvedValueOnce([]);
    const firstContext = context();
    const secondContext = context();
    const args = {
      first: 20,
      skip: 0,
      where: { created_gte: CUTOFF }
    };
    const info = proposalInfo();

    const first = fetchVotes(null, args, firstContext, info);
    const second = fetchVotes(null, args, secondContext, info);

    expect(firstContext.historicalAccess.onRestricted).toHaveBeenCalledTimes(1);
    expect(secondContext.historicalAccess.onRestricted).toHaveBeenCalledTimes(
      1
    );

    release([voteRow()]);
    await expect(Promise.all([first, second])).resolves.toEqual([[], []]);
    expect(queryAsync).toHaveBeenCalledTimes(2);
  });
});
