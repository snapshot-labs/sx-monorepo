import fetchVotes from '../../src/graphql/operations/votes';
import db from '../../src/helpers/mysql';

jest.mock('../../src/helpers/mysql', () => ({
  __esModule: true,
  default: { queryAsync: jest.fn() }
}));

jest.mock('../../src/helpers/requestDeduplicator', () => ({
  __esModule: true,
  default: (_key: string, fn: any, args: any[]) => fn(...args)
}));

const queryAsync = db.queryAsync as jest.Mock;

const PROPOSAL =
  '0x67d414042da88026e2c718284e90a5d79e1c0a32d322a288b373e0d7a21f4cef';

describe('votes resolver index usage', () => {
  beforeEach(() => queryAsync.mockReset());

  it('resolves the proposal space and forces the composite index', async () => {
    queryAsync
      .mockResolvedValueOnce([{ space: 'magicappstore.eth' }])
      .mockResolvedValueOnce([]);

    await fetchVotes(null, {
      first: 1000,
      skip: 0,
      where: { proposal: PROPOSAL }
    });

    const [lookupSql, lookupParams] = queryAsync.mock.calls[0];
    expect(lookupSql).toContain('FROM proposals');
    expect(lookupSql).toContain('WHERE id = ?');
    expect(lookupParams).toEqual([PROPOSAL]);

    const [votesSql, votesParams] = queryAsync.mock.calls[1];
    expect(votesSql).toContain(
      'FORCE INDEX (idx_votes_on_space_proposal_created_id)'
    );
    expect(votesSql).toContain('v.space = ?');
    expect(votesSql).toContain('v.proposal = ?');
    expect(votesParams.slice(0, 2)).toEqual(['magicappstore.eth', PROPOSAL]);
  });

  it('does not look up space when it is already provided', async () => {
    queryAsync.mockResolvedValueOnce([]);

    await fetchVotes(null, {
      first: 1000,
      skip: 0,
      where: { proposal: PROPOSAL, space: 'magicappstore.eth' }
    });

    expect(queryAsync).toHaveBeenCalledTimes(1);
    const [votesSql] = queryAsync.mock.calls[0];
    expect(votesSql).toContain(
      'FORCE INDEX (idx_votes_on_space_proposal_created_id)'
    );
    expect(votesSql).toContain('v.space = ?');
  });

  it('does not force the index or look up space without a proposal filter', async () => {
    queryAsync.mockResolvedValueOnce([]);

    await fetchVotes(null, {
      first: 1000,
      skip: 0,
      where: { voter: '0x0000000000000000000000000000000000000001' }
    });

    expect(queryAsync).toHaveBeenCalledTimes(1);
    const [votesSql] = queryAsync.mock.calls[0];
    expect(votesSql).not.toContain('FORCE INDEX');
  });
});
