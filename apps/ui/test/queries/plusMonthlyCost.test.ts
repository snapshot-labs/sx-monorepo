import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPlusMonthlyCost } from '@/queries/plusMonthlyCost';
import { Space } from '@/types';

const getEthPriceMock = vi.fn();

vi.mock('@/helpers/prices', () => ({
  getEthPrice: () => getEthPriceMock()
}));

vi.mock('@/networks/offchain', () => ({
  HUB_URLS: { s: 'https://hub.test/graphql' }
}));

vi.mock('@/composables/useSettings', () => ({
  isSettingsLoaded: { value: true },
  plusFees: { value: { proposal: 0.008, vote: 0.00016 } }
}));

const SPACE = { id: 'test.eth', network: 's' } as Space;

function mockProposals(votes: number[]) {
  const fetchMock = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          data: { proposals: votes.map(count => ({ votes: count })) }
        })
      )
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('fetchPlusMonthlyCost', () => {
  beforeEach(() => {
    getEthPriceMock.mockReset();
    getEthPriceMock.mockResolvedValue(2000);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('should average the last 3 months of fees in USD', async () => {
    mockProposals([100, 200, 0]);

    // (3 * 0.008 + 300 * 0.00016) ETH / 3 months * $2000
    expect(await fetchPlusMonthlyCost(SPACE)).toBeCloseTo(48);
  });

  it('should query the space proposals of the last 90 days', async () => {
    const fetchMock = mockProposals([]);
    const now = Math.floor(Date.now() / 1e3);

    await fetchPlusMonthlyCost(SPACE);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit
    ];
    const { variables } = JSON.parse(init.body as string);
    expect(url).toBe('https://hub.test/graphql');
    expect(variables.space).toBe('test.eth');
    expect(now - variables.created).toBeCloseTo(90 * 86400, -1);
  });

  it('should skip the ETH price when there is no activity', async () => {
    mockProposals([]);

    expect(await fetchPlusMonthlyCost(SPACE)).toBe(0);
    expect(getEthPriceMock).not.toHaveBeenCalled();
  });

  it('should throw when the ETH price is unavailable', async () => {
    mockProposals([10]);
    getEthPriceMock.mockResolvedValue(null);

    await expect(fetchPlusMonthlyCost(SPACE)).rejects.toThrow(
      'ETH price unavailable'
    );
  });
});
