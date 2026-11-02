import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApi } from '@/networks/offchain/api';
import * as constants from '@/networks/offchain/constants';

const NETWORK = {
  id: '100',
  name: 'Gnosis',
  logo: 'ipfs://logo',
  explorer: 'https://gnosisscan.io',
  spacesCount: 2,
  premium: true
};

describe('offchain api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getNetworks()', () => {
    it('should request the hub once for every caller', async () => {
      const fetchMock = vi.fn(
        async () =>
          new Response(JSON.stringify({ data: { networks: [NETWORK] } }), {
            headers: { 'content-type': 'application/json' }
          })
      );
      vi.stubGlobal('fetch', fetchMock);
      const api = createApi('https://hub.test/graphql', 's', constants);

      const [networks, sameNetworks] = await Promise.all([
        api.getNetworks(),
        api.getNetworks()
      ]);

      expect(networks).toEqual([NETWORK]);
      expect(sameNetworks).toBe(networks);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should request the hub again after a failure', async () => {
      const fetchMock = vi.fn(async () => new Response(null, { status: 500 }));
      vi.stubGlobal('fetch', fetchMock);
      const api = createApi('https://hub.test/graphql', 's', constants);

      await expect(api.getNetworks()).rejects.toThrow();
      await expect(api.getNetworks()).rejects.toThrow();

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
