jest.mock('../../src/helpers/metrics', () => ({
  requestDeduplicatorSize: { set: jest.fn() }
}));

import serve from '../../src/helpers/requestDeduplicator';

describe('request deduplication', () => {
  it('coalesces concurrent requests with the same scoped key', async () => {
    let release: (value: string) => void = () => undefined;
    const action = jest.fn(
      () =>
        new Promise<string>(resolve => {
          release = resolve;
        })
    );

    const first = serve('same-access-scope', action, []);
    const second = serve('same-access-scope', action, []);

    expect(action).toHaveBeenCalledTimes(1);
    release('shared-result');
    await expect(Promise.all([first, second])).resolves.toEqual([
      'shared-result',
      'shared-result'
    ]);
  });

  it('does not coalesce requests from different entitlement scopes', async () => {
    const action = jest.fn(async result => result);

    const results = await Promise.all([
      serve('{"isEntitled":false}', action, ['restricted']),
      serve('{"isEntitled":true}', action, ['full-history'])
    ]);

    expect(action).toHaveBeenCalledTimes(2);
    expect(results).toEqual(['restricted', 'full-history']);
  });
});
