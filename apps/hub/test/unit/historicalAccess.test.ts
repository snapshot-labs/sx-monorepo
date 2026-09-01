import {
  applyHistoricalCollectionBoundary,
  classifyHistoricalRequest,
  enforceHistoricalEntityBoundary,
  getHistoricalAccessConfig,
  getHistoricalAccessContext,
  HistoricalAccessConfig,
  setHistoricalAccessRecorder
} from '../../src/helpers/historicalAccess';
import { sha256 } from '../../src/helpers/utils';

const NOW = 1_800_000_000;
const CUTOFF_DAYS = 365;
const CUTOFF = NOW - CUTOFF_DAYS * 24 * 60 * 60;

function makeConfig(
  overrides: Partial<HistoricalAccessConfig> = {}
): HistoricalAccessConfig {
  return {
    mode: 'enforce',
    cutoffDays: CUTOFF_DAYS,
    entitledKeyHashes: new Set(),
    ...overrides
  };
}

function makeResponse(valid = false) {
  const headers: Record<string, string> = {};
  return {
    headers,
    locals: { keycardData: { valid } },
    getHeader: jest.fn((field: string) => headers[field]),
    setHeader: jest.fn(
      (field: string, value: number | string | readonly string[]) => {
        headers[field] = Array.isArray(value)
          ? value.join(', ')
          : String(value);
      }
    )
  };
}

function makeContext(
  overrides: Partial<HistoricalAccessConfig> = {},
  apiKey?: string,
  valid = false
) {
  const response = makeResponse(valid);
  const req = apiKey ? { headers: { 'x-api-key': apiKey } } : { headers: {} };
  const context = getHistoricalAccessContext(req, response, {
    config: makeConfig(overrides),
    now: NOW
  });
  return { context, response };
}

describe('historical-data access', () => {
  afterEach(() => setHistoricalAccessRecorder());

  it('is disabled by default and rejects invalid activation modes', () => {
    expect(getHistoricalAccessConfig({}).mode).toBe('off');
    expect(() =>
      getHistoricalAccessConfig({ HISTORICAL_DATA_ACCESS_MODE: 'invalid' })
    ).toThrow('HISTORICAL_DATA_ACCESS_MODE');
  });

  it('parses the cutoff and only accepts complete SHA-256 hashes', () => {
    const hash = sha256('paid-key');
    const config = getHistoricalAccessConfig({
      HISTORICAL_DATA_ACCESS_MODE: 'observe',
      HISTORICAL_DATA_CUTOFF_DAYS: '90',
      HISTORICAL_DATA_API_KEY_HASHES: `${hash},bad-hash`
    });

    expect(config.mode).toBe('observe');
    expect(config.cutoffDays).toBe(90);
    expect(config.entitledKeyHashes).toEqual(new Set([hash]));
    expect(
      getHistoricalAccessConfig({ HISTORICAL_DATA_CUTOFF_DAYS: '1.5' })
        .cutoffDays
    ).toBe(CUTOFF_DAYS);
  });

  it.each([
    [{}, undefined, false, 'anonymous', false],
    [{}, 'free-key', true, 'keyed', false],
    [
      { entitledKeyHashes: new Set([sha256('paid-key')]) },
      'paid-key',
      true,
      'entitled',
      true
    ],
    [{ internalKey: 'internal-key' }, 'internal-key', false, 'internal', true]
  ])(
    'classifies key access state',
    (overrides, apiKey, valid, keyState, isEntitled) => {
      const { context } = makeContext(overrides, apiKey, valid);
      expect(context.keyState).toBe(keyState);
      expect(context.isEntitled).toBe(isEntitled);
      expect(context.cutoff).toBe(CUTOFF);
    }
  );

  it('requires the allowlisted key to be valid in Keycard', () => {
    const { context } = makeContext(
      { entitledKeyHashes: new Set([sha256('paid-key')]) },
      'paid-key',
      false
    );

    expect(context.keyState).toBe('anonymous');
    expect(context.isEntitled).toBe(false);
  });

  it('supports query-param keys without retaining the raw key in context', () => {
    const response = makeResponse(true);
    (response as any).req = {
      headers: { 'x-api-key': 'must-not-appear' }
    };
    const context = getHistoricalAccessContext(
      { headers: {}, query: { apiKey: 'paid-key' } },
      response,
      {
        config: makeConfig({
          entitledKeyHashes: new Set([sha256('paid-key')])
        }),
        now: NOW
      }
    );

    expect(context.keyState).toBe('entitled');
    expect(JSON.stringify(context)).not.toContain('paid-key');
  });

  it.each([
    [{ created: CUTOFF - 1 }, 'explicit_history'],
    [{ created_in: [CUTOFF, CUTOFF + 1] }, 'recent_bounded'],
    [{ created_in: [CUTOFF - 1, CUTOFF] }, 'explicit_history'],
    [{ created_gte: CUTOFF }, 'recent_bounded'],
    [{ created_gt: CUTOFF - 1 }, 'explicit_history'],
    [{ created_lte: NOW }, 'explicit_history'],
    [{}, 'unbounded']
  ])('classifies timestamp filters', (where, expected) => {
    expect(classifyHistoricalRequest(where, CUTOFF)).toBe(expected);
  });

  it('does not inspect or mutate requests while disabled', () => {
    const { context, response } = makeContext({ mode: 'off' });
    const args = { first: 20, where: {} };

    expect(applyHistoricalCollectionBoundary(args, context, 'proposals')).toBe(
      args
    );
    expect(response.setHeader).not.toHaveBeenCalled();
  });

  it('observes an unbounded request without changing its query', () => {
    const metrics = jest.fn();
    setHistoricalAccessRecorder(metrics);
    const { context, response } = makeContext({ mode: 'observe' });
    const args = { first: 20, where: {} };

    expect(applyHistoricalCollectionBoundary(args, context, 'proposals')).toBe(
      args
    );
    expect(response.setHeader).not.toHaveBeenCalled();
    expect(metrics).toHaveBeenCalledWith({
      resource: 'proposals',
      key_state: 'anonymous',
      request_class: 'unbounded',
      mode: 'observe',
      outcome: 'observed'
    });
  });

  it('leaves entitled historical requests unchanged', () => {
    const { context, response } = makeContext(
      { entitledKeyHashes: new Set([sha256('paid-key')]) },
      'paid-key',
      true
    );
    const args = { where: { created_lte: CUTOFF - 1 } };

    expect(applyHistoricalCollectionBoundary(args, context, 'proposals')).toBe(
      args
    );
    expect(response.headers).toMatchObject({
      Vary: 'X-Api-Key',
      'Cache-Control': 'private, no-store'
    });
  });

  it('clamps unbounded enforcement queries without mutating the caller', () => {
    const { context, response } = makeContext();
    const args = { first: 20, where: { space: 'example.eth' } };

    const bounded = applyHistoricalCollectionBoundary(
      args,
      context,
      'proposals'
    );

    expect(bounded).toEqual({
      first: 20,
      where: { space: 'example.eth', created_gte: CUTOFF }
    });
    expect(args.where).toEqual({ space: 'example.eth' });
    expect(response.headers).toMatchObject({
      'Cache-Control': 'private, no-store',
      'X-Historical-Data-Access': 'restricted',
      'X-Historical-Data-Cutoff': CUTOFF.toString()
    });
  });

  it('allows recent bounded enforcement queries', () => {
    const { context, response } = makeContext();
    const args = { where: { created_gte: CUTOFF } };

    expect(applyHistoricalCollectionBoundary(args, context, 'proposals')).toBe(
      args
    );
    expect(response.headers['X-Historical-Data-Access']).toBeUndefined();
  });

  it('adds a conjunctive cutoff to explicit historical filters', () => {
    const { context, response } = makeContext();

    expect(
      applyHistoricalCollectionBoundary(
        { where: { created_lte: CUTOFF - 1 } },
        context,
        'proposals'
      )
    ).toEqual({
      where: { created_lte: CUTOFF - 1, created_gte: CUTOFF }
    });
    expect(response.headers['X-Historical-Data-Access']).toBe('restricted');
  });

  it('enforces the same boundary for exact historical entities', () => {
    const { context } = makeContext();

    expect(
      enforceHistoricalEntityBoundary(CUTOFF - 1, context, 'proposal')
    ).toBe(false);
    expect(enforceHistoricalEntityBoundary(CUTOFF, context, 'proposal')).toBe(
      true
    );
    expect(
      enforceHistoricalEntityBoundary('invalid', context, 'proposal')
    ).toBe(false);
  });
});
