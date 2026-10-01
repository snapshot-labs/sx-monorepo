import router from '../../src/eip4824';
import db, { sequencerDB } from '../../src/helpers/mysql';
import { getSpace } from '../../src/helpers/spaces';
import { sha256 } from '../../src/helpers/utils';

jest.mock('../../src/helpers/mysql', () => ({
  __esModule: true,
  default: { queryAsync: jest.fn() },
  sequencerDB: { queryAsync: jest.fn() }
}));

jest.mock('../../src/helpers/spaces', () => ({
  getSpace: jest.fn()
}));

const queryAsync = db.queryAsync as jest.Mock;
const sequencerQueryAsync = sequencerDB.queryAsync as jest.Mock;
const getSpaceMock = getSpace as jest.Mock;

function routeHandler(path: string) {
  const layer = (router as any).stack.find(layer => layer.route?.path === path);
  return layer.route.stack[0].handle;
}

function request(apiKey?: string) {
  return {
    params: { space: 'example.eth' },
    headers: apiKey ? { 'x-api-key': apiKey } : {},
    query: {}
  };
}

function response(valid = false) {
  const headers: Record<string, string> = {};
  const res: any = {
    headers,
    locals: { keycardData: { valid } },
    getHeader: jest.fn((name: string) => headers[name]),
    setHeader: jest.fn((name: string, value: string) => {
      headers[name] = String(value);
    }),
    json: jest.fn()
  };
  res.status = jest.fn(() => res);
  return res;
}

describe('EIP-4824 historical access', () => {
  beforeEach(() => {
    process.env.HISTORICAL_DATA_ACCESS_MODE = 'enforce';
    process.env.HISTORICAL_DATA_CUTOFF_DAYS = '365';
    delete process.env.HISTORICAL_DATA_API_KEY_HASHES;
    queryAsync.mockReset();
    sequencerQueryAsync.mockReset();
    getSpaceMock.mockReset().mockResolvedValue({
      verified: true,
      name: 'Example'
    });
  });

  afterAll(() => {
    delete process.env.HISTORICAL_DATA_ACCESS_MODE;
    delete process.env.HISTORICAL_DATA_CUTOFF_DAYS;
    delete process.env.HISTORICAL_DATA_API_KEY_HASHES;
  });

  it.each([
    ['/:space/proposals', queryAsync, 'created'],
    ['/:space/activities', sequencerQueryAsync, 'timestamp']
  ])(
    'adds the cutoff before pagination on %s',
    async (path, databaseQuery, timestampField) => {
      databaseQuery.mockResolvedValueOnce([]);
      const res = response();

      await routeHandler(path)(request(), res);

      const [sql, params] = databaseQuery.mock.calls[0];
      expect(sql).toContain(`AND ${timestampField} >= ?`);
      expect(params[0]).toBe('example.eth');
      expect(params[1]).toEqual(expect.any(Number));
      expect(res.headers['X-Historical-Data-Access']).toBe('restricted');
    }
  );

  it.each([
    ['/:space/proposals', queryAsync, 'created'],
    ['/:space/activities', sequencerQueryAsync, 'timestamp']
  ])(
    'keeps full history on %s for an entitled Keycard key',
    async (path, databaseQuery, timestampField) => {
      process.env.HISTORICAL_DATA_API_KEY_HASHES = sha256('paid-key');
      databaseQuery.mockResolvedValueOnce([]);
      const res = response(true);

      await routeHandler(path)(request('paid-key'), res);

      const [sql, params] = databaseQuery.mock.calls[0];
      expect(sql).not.toContain(`AND ${timestampField} >= ?`);
      expect(params).toEqual(['example.eth']);
      expect(res.headers['X-Historical-Data-Access']).toBeUndefined();
      expect(res.headers['Cache-Control']).toBe('private, no-store');
    }
  );
});
