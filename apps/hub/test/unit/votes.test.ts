import { parse } from 'graphql';
import fetchVotes, {
  getVotesRequestDeduplicationKey
} from '../../src/graphql/operations/votes';
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
    proposal: PROPOSAL,
    reason: '',
    app: 'snapshot',
    created: 1700000001,
    vp: 1,
    vp_state: 'final',
    vp_value: 1,
    choice: '1',
    metadata: '{}',
    vp_by_strategy: '[]',
    settings: '{}'
  };
}

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
    // id tie-break must match the created direction so the composite index is
    // scanned (backward) instead of triggering a filesort.
    expect(votesSql.replace(/\s+/g, ' ')).toContain(
      'ORDER BY v.created DESC, v.id DESC'
    );
    expect(votesParams.slice(0, 2)).toEqual(['magicappstore.eth', PROPOSAL]);
  });

  it('returns empty without querying votes when the proposal does not exist', async () => {
    queryAsync.mockResolvedValueOnce([]);

    const result = await fetchVotes(null, {
      first: 1000,
      skip: 0,
      where: { proposal: PROPOSAL }
    });

    expect(result).toEqual([]);
    // Only the proposal->space lookup runs; the votes SELECT is skipped.
    expect(queryAsync).toHaveBeenCalledTimes(1);
    const [lookupSql] = queryAsync.mock.calls[0];
    expect(lookupSql).toContain('FROM proposals');
    expect(
      queryAsync.mock.calls.some(([sql]) => sql.includes('FROM votes'))
    ).toBe(false);
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

  it('matches the id tie-break to the sort direction on a non-proposal query', async () => {
    queryAsync.mockResolvedValueOnce([]);

    await fetchVotes(null, {
      first: 1000,
      skip: 0,
      orderDirection: 'desc',
      where: { voter: '0x0000000000000000000000000000000000000001' }
    });

    const [votesSql] = queryAsync.mock.calls[0];
    expect(votesSql).not.toContain('FORCE INDEX');
    expect(votesSql.replace(/\s+/g, ' ')).toContain(
      'ORDER BY v.created DESC, v.id DESC'
    );
  });

  it('does not force the index or look up space for a proposal query ordered by vp', async () => {
    queryAsync.mockResolvedValueOnce([]);

    await fetchVotes(null, {
      first: 1000,
      skip: 0,
      orderBy: 'vp',
      orderDirection: 'desc',
      where: { proposal: PROPOSAL }
    });

    // The space lookup only serves the created path; a vp-ordered query resolves
    // via idx_votes_on_proposal_vp_id, so it skips the lookup and the hint.
    expect(queryAsync).toHaveBeenCalledTimes(1);
    expect(
      queryAsync.mock.calls.some(([sql]) => sql.includes('FROM proposals'))
    ).toBe(false);
    const [votesSql] = queryAsync.mock.calls[0];
    expect(votesSql).not.toContain('FORCE INDEX');
    expect(votesSql).not.toContain('v.space = ?');
  });

  it('does not force the index or look up space when a selective filter accompanies the proposal', async () => {
    queryAsync.mockResolvedValueOnce([]);

    await fetchVotes(null, {
      first: 1000,
      skip: 0,
      where: {
        proposal: PROPOSAL,
        voter: '0x0000000000000000000000000000000000000001'
      }
    });

    // voter resolves via the primary key; the injected space is a wasted
    // round-trip, so the lookup is skipped along with the hint.
    expect(queryAsync).toHaveBeenCalledTimes(1);
    expect(
      queryAsync.mock.calls.some(([sql]) => sql.includes('FROM proposals'))
    ).toBe(false);
    const [votesSql] = queryAsync.mock.calls[0];
    expect(votesSql).not.toContain('FORCE INDEX');
  });

  it('collapses a single-element proposal_in onto the indexed path', async () => {
    queryAsync
      .mockResolvedValueOnce([{ space: 'magicappstore.eth' }])
      .mockResolvedValueOnce([]);

    await fetchVotes(null, {
      first: 1000,
      skip: 0,
      where: { proposal_in: [PROPOSAL] }
    });

    const [lookupSql, lookupParams] = queryAsync.mock.calls[0];
    expect(lookupSql).toContain('FROM proposals');
    expect(lookupParams).toEqual([PROPOSAL]);

    const [votesSql, votesParams] = queryAsync.mock.calls[1];
    expect(votesSql).toContain(
      'FORCE INDEX (idx_votes_on_space_proposal_created_id)'
    );
    expect(votesSql).toContain('v.proposal = ?');
    expect(votesParams.slice(0, 2)).toEqual(['magicappstore.eth', PROPOSAL]);
  });

  it('collapses a single-element space_in onto the indexed path', async () => {
    queryAsync.mockResolvedValueOnce([]);

    await fetchVotes(null, {
      first: 1000,
      skip: 0,
      where: { proposal: PROPOSAL, space_in: ['magicappstore.eth'] }
    });

    // space_in already pins the space, so no lookup runs, but the hint still
    // engages because the filter collapses to v.space = ?.
    expect(queryAsync).toHaveBeenCalledTimes(1);
    const [votesSql, votesParams] = queryAsync.mock.calls[0];
    expect(votesSql).toContain(
      'FORCE INDEX (idx_votes_on_space_proposal_created_id)'
    );
    expect(votesSql).toContain('v.space = ?');
    expect(votesSql).not.toContain('v.space IN');
    expect(votesParams.slice(0, 2)).toEqual(['magicappstore.eth', PROPOSAL]);
  });

  it('rejects when the proposal space lookup fails instead of running the unscoped votes query', async () => {
    queryAsync.mockRejectedValueOnce(new Error('lookup failed'));

    await expect(
      fetchVotes(null, {
        first: 1000,
        skip: 0,
        where: { proposal: PROPOSAL }
      })
    ).rejects.toThrow('request failed');

    expect(queryAsync).toHaveBeenCalledTimes(1);
    expect(
      queryAsync.mock.calls.some(([sql]) => sql.includes('FROM votes'))
    ).toBe(false);
  });

  it.each([
    ['app', { app: 'boardroom' }],
    ['vp_gt', { vp_gt: 1000 }],
    ['vp_state', { vp_state: 'pending' }],
    ['reason_not', { reason_not: 'spam' }]
  ])(
    'scopes by space but does not force the index when %s filters the proposal',
    async (_label, filter) => {
      queryAsync
        .mockResolvedValueOnce([{ space: 'magicappstore.eth' }])
        .mockResolvedValueOnce([]);

      await fetchVotes(null, {
        first: 1000,
        skip: 0,
        where: { proposal: PROPOSAL, ...filter }
      });

      // The forced index cannot evaluate a filter it does not cover, so it
      // would walk the whole proposal fetching rows; the space scope is still
      // result-neutral and still the win, so it stays.
      const [votesSql] = queryAsync.mock.calls[1];
      expect(votesSql).not.toContain('FORCE INDEX');
      expect(votesSql).toContain('v.space = ?');
      expect(votesSql).toContain('v.proposal = ?');
    }
  );

  it('still forces the index for a created range on the proposal', async () => {
    queryAsync
      .mockResolvedValueOnce([{ space: 'magicappstore.eth' }])
      .mockResolvedValueOnce([]);

    await fetchVotes(null, {
      first: 1000,
      skip: 0,
      where: { proposal: PROPOSAL, created_gt: 1700000000 }
    });

    // created is inside the composite index, so it is a range the forced scan
    // resolves from the index itself.
    const [votesSql] = queryAsync.mock.calls[1];
    expect(votesSql).toContain(
      'FORCE INDEX (idx_votes_on_space_proposal_created_id)'
    );
    expect(votesSql).toContain('v.created > ?');
  });

  it('does not let a collapsed proposal_in carry a non-covered filter onto the forced index', async () => {
    queryAsync
      .mockResolvedValueOnce([{ space: 'magicappstore.eth' }])
      .mockResolvedValueOnce([]);

    await fetchVotes(null, {
      first: 1000,
      skip: 0,
      where: { proposal_in: [PROPOSAL], vp_gte: 1 }
    });

    const [votesSql, votesParams] = queryAsync.mock.calls[1];
    expect(votesSql).not.toContain('FORCE INDEX');
    expect(votesSql).toContain('v.space = ?');
    expect(votesSql).toContain('v.proposal = ?');
    expect(votesParams.slice(0, 2)).toEqual(['magicappstore.eth', PROPOSAL]);
  });

  it('matches the id tie-break to an ascending sort direction', async () => {
    queryAsync.mockResolvedValueOnce([]);

    await fetchVotes(null, {
      first: 1000,
      skip: 0,
      orderDirection: 'asc',
      where: { voter: '0x0000000000000000000000000000000000000001' }
    });

    const [votesSql] = queryAsync.mock.calls[0];
    expect(votesSql.replace(/\s+/g, ' ')).toContain(
      'ORDER BY v.created ASC, v.id ASC'
    );
  });

  it('separates entitled and restricted requests in the deduplication key', () => {
    const args = { first: 20, where: { created_gte: 1700000000 } };
    const restricted = getVotesRequestDeduplicationKey(
      args,
      {},
      {
        historicalAccess: {
          mode: 'enforce',
          cutoff: 1700000000,
          isEntitled: false,
          response: { rawKey: 'must-not-appear' }
        }
      }
    );
    const entitled = getVotesRequestDeduplicationKey(
      args,
      {},
      {
        historicalAccess: {
          mode: 'enforce',
          cutoff: 1700000000,
          isEntitled: true,
          response: { rawKey: 'must-not-appear' }
        }
      }
    );

    expect(restricted).not.toBe(entitled);
    expect(restricted).not.toContain('must-not-appear');
    expect(entitled).not.toContain('must-not-appear');
  });

  it('preserves the existing deduplication key while off or observing', () => {
    const args = { first: 20, where: {} };
    const original = getVotesRequestDeduplicationKey(args, {}, undefined);

    for (const mode of ['off', 'observe']) {
      expect(
        getVotesRequestDeduplicationKey(
          args,
          {},
          {
            historicalAccess: {
              mode,
              cutoff: 1700000000,
              isEntitled: false
            }
          }
        )
      ).toBe(original);
    }
  });

  it.each([
    [false, true, 2],
    [true, false, 1]
  ])(
    'applies the archive boundary to nested proposals (entitled=%s)',
    async (isEntitled, expectsCutoff, expectedParamCount) => {
      const cutoff = 1700000000;
      queryAsync.mockResolvedValueOnce([voteRow()]).mockResolvedValueOnce([]);

      await fetchVotes(
        null,
        { first: 20, skip: 0, where: { created_gte: cutoff } },
        {
          historicalAccess: {
            mode: 'enforce',
            cutoff,
            keyState: isEntitled ? 'entitled' : 'anonymous',
            isEntitled
          }
        },
        proposalInfo()
      );

      const [proposalSql, proposalParams] = queryAsync.mock.calls[1];
      expect(proposalSql.includes('p.created >= ?')).toBe(expectsCutoff);
      expect(proposalParams).toHaveLength(expectedParamCount);
      if (expectsCutoff) expect(proposalParams[1]).toBe(cutoff);
    }
  );
});
