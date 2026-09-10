import fetchMessages from '../../src/graphql/operations/messages';
import fetchProposal from '../../src/graphql/operations/proposal';
import fetchProposals from '../../src/graphql/operations/proposals';
import db, { sequencerDB } from '../../src/helpers/mysql';

jest.mock('../../src/helpers/mysql', () => ({
  __esModule: true,
  default: { queryAsync: jest.fn() },
  sequencerDB: { queryAsync: jest.fn() }
}));

const queryAsync = db.queryAsync as jest.Mock;
const sequencerQueryAsync = sequencerDB.queryAsync as jest.Mock;
const CUTOFF = 1700000000;

function context(isEntitled: boolean) {
  return {
    historicalAccess: {
      mode: 'enforce',
      cutoff: CUTOFF,
      keyState: isEntitled ? 'entitled' : 'anonymous',
      isEntitled,
      onGated: jest.fn(),
      onRestricted: jest.fn()
    }
  };
}

function proposalRow(created: unknown) {
  return {
    id: 'proposal-1',
    space: 'example.eth',
    created,
    start: CUTOFF,
    end: CUTOFF + 100,
    choices: '[]',
    labels: '[]',
    strategies: '[]',
    validation: '{}',
    plugins: '{}',
    settings: '{}'
  };
}

describe('historical resolver wiring', () => {
  beforeEach(() => {
    queryAsync.mockReset();
    sequencerQueryAsync.mockReset();
  });

  it.each([
    ['restricted', false, true, 3],
    ['entitled', true, false, 2]
  ])(
    'applies the proposal SQL cutoff for %s collection access',
    async (_label, isEntitled, expectsCutoff, expectedParamCount) => {
      queryAsync.mockResolvedValueOnce([]);

      await fetchProposals(
        null,
        { first: 20, skip: 0, where: {} },
        context(isEntitled)
      );

      const [sql, params] = queryAsync.mock.calls[0];
      expect(sql.includes('p.created >= ?')).toBe(expectsCutoff);
      expect(params).toHaveLength(expectedParamCount);
      if (expectsCutoff) expect(params[0]).toBe(CUTOFF);
      expect(params.slice(-2)).toEqual([0, 20]);
    }
  );

  it.each([
    ['restricted', false, true, 3],
    ['entitled', true, false, 2]
  ])(
    'applies the message SQL cutoff for %s collection access',
    async (_label, isEntitled, expectsCutoff, expectedParamCount) => {
      sequencerQueryAsync.mockResolvedValueOnce([]);

      await fetchMessages(
        null,
        { first: 20, skip: 0, where: {} },
        context(isEntitled)
      );

      const [sql, params] = sequencerQueryAsync.mock.calls[0];
      expect(sql.includes('m.timestamp >= ?')).toBe(expectsCutoff);
      expect(params).toHaveLength(expectedParamCount);
      if (expectsCutoff) expect(params[0]).toBe(CUTOFF);
      expect(params.slice(-2)).toEqual([0, 20]);
    }
  );

  it('returns null for a restricted exact historical proposal', async () => {
    queryAsync.mockResolvedValueOnce([proposalRow(CUTOFF - 1)]);
    const restrictedContext = context(false);

    await expect(
      fetchProposal(null, { id: 'proposal-1' }, restrictedContext)
    ).resolves.toBeNull();
    expect(
      restrictedContext.historicalAccess.onRestricted
    ).toHaveBeenCalledTimes(1);
  });

  it('returns an exact historical proposal to an entitled key', async () => {
    queryAsync.mockResolvedValueOnce([proposalRow(CUTOFF - 1)]);

    await expect(
      fetchProposal(null, { id: 'proposal-1' }, context(true))
    ).resolves.toMatchObject({ id: 'proposal-1', created: CUTOFF - 1 });
  });
});
