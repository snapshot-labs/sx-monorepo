import fetchProposals, {
  titleMatchQuery
} from '../../src/graphql/operations/proposals';
import db from '../../src/helpers/mysql';

jest.mock('../../src/helpers/mysql', () => ({
  __esModule: true,
  default: { queryAsync: jest.fn() }
}));

const queryAsync = db.queryAsync as jest.Mock;

const TIMEOUT = Object.assign(new Error('Query execution was interrupted'), {
  errno: 3024
});

async function search(where: Record<string, unknown>, ...results: any[]) {
  queryAsync.mockReset();
  for (const result of results) {
    if (result instanceof Error) queryAsync.mockRejectedValueOnce(result);
    else queryAsync.mockResolvedValueOnce(result);
  }
  const outcome = await fetchProposals(null, { first: 20, skip: 0, where })
    .then(() => 'ok')
    .catch((err: Error) => err.message);
  const calls = queryAsync.mock.calls.map(([sql, params]) => ({
    sql: sql.replace(/\s+/g, ' '),
    params
  }));
  return { outcome, calls };
}

describe('titleMatchQuery', () => {
  it.each([
    ['uniswap', '+"uniswap"'],
    ['swap', '+"swap"'],
    ['treasury grant', '+"treasury" +"grant"'],
    ['eip 1559', '+"1559"'],
    ['ens', '+"ens"'],
    ['2024', '+"2024"'],
    ['votação', '+"votação"'],
    ['голосование', '+"голосование"'],
    ['提案', '+"提案"'],
    // Words the index cannot find are left out, the LIKE still checks them
    ['test 4', '+"test"'],
    ['project a', '+"project"'],
    ['dao treasury', '+"treasury"'],
    // Unicode spaces and line breaks separate words
    ['line\u2028break', '+"break" +"line"'],
    // The 3 longest words are enough to narrow the search
    ['one two three four five', '+"three" +"four" +"five"'],
    ['vote\u00a0now', '+"vote" +"now"'],
    ['aave  v3', '+"aave" +"v3"']
  ])('searches %j with %j', (term, query) => {
    expect(titleMatchQuery(term)).toBe(query);
  });

  it.each([
    // No word has a character pair the index keeps
    'dao',
    'is',
    'in',
    'can',
    'to be',
    'ai',
    'x',
    '',
    '   ',
    // Outside the Basic Multilingual Plane
    '𝕠𝕟𝕖𝕩',
    // LIKE wildcards, escapes, quotes and punctuation
    '100%',
    'a_b',
    'eip-1559',
    'v1.2',
    '"quoted"',
    'back\\slash',
    "don't",
    '#12',
    'gm!',
    '👍👍',
    // Control characters
    'a\u0000b',
    'gm\u0007',
    'ab\u202ecd'
  ])('keeps LIKE alone for %j', term => {
    expect(titleMatchQuery(term)).toBeNull();
  });
});

describe('proposals title search', () => {
  const where = { title_contains: 'Uniswap', strategies_contains: 'erc20' };

  it('keeps the capped LIKE scan when it finishes', async () => {
    const { outcome, calls } = await search(where, []);

    expect(outcome).toBe('ok');
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain('SELECT /*+ MAX_EXECUTION_TIME(200) */');
    expect(calls[0].sql).toContain(
      'AND LOWER(p.title) LIKE ? AND p.strategies LIKE ?'
    );
    expect(calls[0].sql).not.toContain('MATCH');
    expect(calls[0].params.slice(-4)).toEqual(['%uniswap%', '%erc20%', 0, 20]);
  });

  it('falls back to the FULLTEXT index when the scan is interrupted', async () => {
    const { outcome, calls } = await search(where, TIMEOUT, []);

    expect(outcome).toBe('ok');
    expect(calls).toHaveLength(2);
    expect(calls[1].sql).not.toContain('MAX_EXECUTION_TIME');
    expect(calls[1].sql).toContain(
      'AND LOWER(p.title) LIKE ? AND p.strategies LIKE ? AND MATCH(p.title_lower) AGAINST (? IN BOOLEAN MODE)'
    );
    expect(calls[1].params.slice(-5)).toEqual([
      '%uniswap%',
      '%erc20%',
      '+"uniswap"',
      0,
      20
    ]);
  });

  it('searches as before when the FULLTEXT query fails', async () => {
    const { outcome, calls } = await search(
      where,
      TIMEOUT,
      new Error('Unknown column title_lower'),
      []
    );

    expect(outcome).toBe('ok');
    expect(calls).toHaveLength(3);
    expect(calls[2].sql).not.toContain('MAX_EXECUTION_TIME');
    expect(calls[2].sql).not.toContain('MATCH');
    expect(calls[2].params.slice(-4)).toEqual(['%uniswap%', '%erc20%', 0, 20]);
  });

  it('reports an error when every query fails', async () => {
    const lost = new Error('connection lost');
    const { outcome, calls } = await search(where, TIMEOUT, lost, lost);

    expect(outcome).toBe('request failed');
    expect(calls).toHaveLength(3);
  });

  it("runs today's query unchanged when the index cannot be used", async () => {
    const { outcome, calls } = await search({ title_contains: 'DAO' }, []);

    expect(outcome).toBe('ok');
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).not.toContain('MAX_EXECUTION_TIME');
    expect(calls[0].sql).not.toContain('MATCH');
    expect(calls[0].params.slice(-3)).toEqual(['%dao%', 0, 20]);
  });

  it('does not search titles without title_contains', async () => {
    const { calls } = await search({}, []);

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).not.toContain('LIKE');
    expect(calls[0].sql).not.toContain('MAX_EXECUTION_TIME');
    expect(calls[0].sql).not.toContain('MATCH');
  });
});
