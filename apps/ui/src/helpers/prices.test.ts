import { afterEach, describe, expect, it, vi } from 'vitest';
import { ETH_CONTRACT } from './constants';
import { getTokenPrices } from './prices';

function fakeAddress(i: number) {
  return `0x${i.toString(16).padStart(40, '0')}`;
}

function mockFetch() {
  const calls: string[] = [];

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      calls.push(url);

      const coinIds = url.split('/').pop()!.split(',');
      const coins = Object.fromEntries(
        coinIds.map(id => [id, { price: 1, symbol: 'X' }])
      );

      return { json: async () => ({ coins }) };
    })
  );

  return calls;
}

describe('getTokenPrices', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prices every ERC-20 token alongside the native asset when there are exactly 100 of them', async () => {
    mockFetch();

    const erc20s = Array.from({ length: 100 }, (_, i) => fakeAddress(i));
    const result = await getTokenPrices('1', [ETH_CONTRACT, ...erc20s]);

    expect(Object.keys(result)).toHaveLength(101);
    expect(result[ETH_CONTRACT]).toBeDefined();
    erc20s.forEach(address => expect(result[address]).toBeDefined());
  });

  it('paginates across multiple requests when there are more addresses than a single batch allows', async () => {
    const calls = mockFetch();

    const erc20s = Array.from({ length: 250 }, (_, i) => fakeAddress(i));
    const result = await getTokenPrices('1', [ETH_CONTRACT, ...erc20s]);

    expect(Object.keys(result)).toHaveLength(251);
    expect(calls).toHaveLength(4);
  });

  it('keeps each request under the API URL length limit even when the address count alone would fit one batch', async () => {
    const calls = mockFetch();

    const erc20s = Array.from({ length: 180 }, (_, i) => fakeAddress(i));
    const result = await getTokenPrices('1', erc20s);

    expect(Object.keys(result)).toHaveLength(180);
    expect(calls.length).toBeGreaterThan(2);
    calls.forEach(url => expect(url.length).toBeLessThan(9000));
  });
});
