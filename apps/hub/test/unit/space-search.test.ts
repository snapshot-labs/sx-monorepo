import { fetchSpaces } from '../../src/graphql/helpers';
import ranking from '../../src/graphql/operations/ranking';
import db from '../../src/helpers/mysql';

jest.mock('../../src/helpers/mysql', () => ({
  __esModule: true,
  default: { queryAsync: jest.fn() }
}));

jest.mock('../../src/helpers/spaces', () => ({
  rankedSpaces: [
    {
      id: 'worldlibertyfinancial.com',
      name: 'World Liberty Financial',
      symbol: 'WLFI',
      categories: []
    },
    { id: 'example.eth', name: 'Example', categories: [] }
  ],
  spacesMetadata: {},
  DEFAULT_COUNTS: {}
}));

jest.mock('../../src/graphql/helpers', () => ({
  ...jest.requireActual('../../src/graphql/helpers'),
  handleRelatedSpaces: (_info, spaces) => spaces
}));

const queryAsync = db.queryAsync as jest.Mock;

beforeEach(() => queryAsync.mockReset().mockResolvedValue([]));

describe('Explore ticker search', () => {
  it.each(['WLFI', 'wlfi', 'WlFi'])(
    'matches the full ticker %s',
    async search => {
      const result = await ranking(
        null,
        { first: 20, skip: 0, where: { search } },
        {},
        {}
      );

      expect(result).toMatchObject({ metrics: { total: 1 } });
      expect(queryAsync.mock.calls[0][1][0]).toEqual([
        'worldlibertyfinancial.com'
      ]);
    }
  );

  it.each(['WLF', 'lfi', 'WLFIx', 'xWLFI', '$WLFI', 'WLFI token'])(
    'does not match a partial or extended ticker %s',
    async search => {
      const result = await ranking(
        null,
        { first: 20, skip: 0, where: { search } },
        {},
        {}
      );

      expect(result).toEqual({
        items: [],
        metrics: { total: 0, categories: {} }
      });
      expect(queryAsync).not.toHaveBeenCalled();
    }
  );

  it.each(['worldliberty', 'LIBERTY'])(
    'preserves partial name and ID matching for %s',
    async search => {
      const result = await ranking(
        null,
        { first: 20, skip: 0, where: { search } },
        {},
        {}
      );

      expect(result).toMatchObject({ metrics: { total: 1 } });
    }
  );

  it('preserves empty search and spaces without a symbol', async () => {
    const result = await ranking(
      null,
      { first: 20, skip: 0, where: {} },
      {},
      {}
    );

    expect(result).toMatchObject({ metrics: { total: 2 } });
  });
});

describe('spaces search query', () => {
  it.each(['WLFI', 'wlfi', 'WlFi', 'WLF', '%', '_'])(
    'uses equality and a literal parameter for ticker %s',
    async search => {
      await fetchSpaces({ first: 20, skip: 0, where: { search } });

      const [sql, params] = queryAsync.mock.calls[0];
      expect(sql).toContain(
        "LOWER(JSON_UNQUOTE(JSON_EXTRACT(s.settings, '$.symbol'))) = ?"
      );
      expect(params).toEqual(
        expect.arrayContaining([
          `%${search}%`,
          `%${search}%`,
          search.toLowerCase()
        ])
      );
    }
  );
});
