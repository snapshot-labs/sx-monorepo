import fetchProposals, {
  titleMatchQuery
} from '../../src/graphql/operations/proposals';
import db from '../../src/helpers/mysql';

jest.mock('../../src/helpers/mysql', () => ({
  __esModule: true,
  default: { queryAsync: jest.fn() }
}));

const queryAsync = db.queryAsync as jest.Mock;

async function search(where: Record<string, unknown>) {
  queryAsync.mockReset().mockResolvedValueOnce([]);
  await fetchProposals(null, { first: 20, skip: 0, where });
  const [sql, params] = queryAsync.mock.calls[0];
  return { sql: sql.replace(/\s+/g, ' '), params };
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
    '👍👍'
  ])('keeps LIKE alone for %j', term => {
    expect(titleMatchQuery(term)).toBeNull();
  });
});

describe('proposals title search', () => {
  it('adds the FULLTEXT prefilter after the LIKE, with matching params', async () => {
    const { sql, params } = await search({
      title_contains: 'Uniswap',
      strategies_contains: 'erc20'
    });

    expect(sql).toContain(
      'AND LOWER(p.title) LIKE ? AND MATCH(p.title_lower) AGAINST (? IN BOOLEAN MODE) AND p.strategies LIKE ?'
    );
    expect(params.slice(0, 3)).toEqual(['%uniswap%', '+"uniswap"', '%erc20%']);
  });

  it("keeps today's query when the term cannot use the index", async () => {
    const { sql, params } = await search({ title_contains: 'DAO' });

    expect(sql).toContain('AND LOWER(p.title) LIKE ?');
    expect(sql).not.toContain('MATCH');
    expect(params.slice(0, 1)).toEqual(['%dao%']);
  });

  it('does not search titles without title_contains', async () => {
    const { sql } = await search({});

    expect(sql).not.toContain('LIKE');
    expect(sql).not.toContain('MATCH');
  });
});
