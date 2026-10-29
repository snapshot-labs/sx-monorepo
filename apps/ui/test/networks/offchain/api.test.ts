import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApi } from '@/networks/offchain/api';
import * as constants from '@/networks/offchain/constants';

describe('offchain api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getNetworks()', () => {
    it('should request once and only keep ipfs logos and https explorers', async () => {
      const fetchMock = vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: {
                networks: [
                  {
                    id: '100',
                    name: 'Gnosis',
                    logo: 'ipfs://logo',
                    explorer: 'https://gnosisscan.io',
                    spacesCount: 2,
                    premium: true
                  },
                  {
                    id: '101',
                    name: 'Unsafe',
                    logo: 'https://tracker.example/logo.png',
                    explorer: 'javascript:alert(1)',
                    spacesCount: 0,
                    premium: false
                  }
                ]
              }
            }),
            { headers: { 'content-type': 'application/json' } }
          )
      );
      vi.stubGlobal('fetch', fetchMock);
      const api = createApi('https://hub.test/graphql', 's', constants);

      const [networks, sameNetworks] = await Promise.all([
        api.getNetworks(),
        api.getNetworks()
      ]);

      expect(networks).toBe(sameNetworks);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(networks).toEqual({
        100: {
          name: 'Gnosis',
          logo: 'ipfs://logo',
          explorer: 'https://gnosisscan.io',
          spaces_count: 2,
          premium: true
        },
        101: {
          name: 'Unsafe',
          logo: '',
          explorer: '',
          spaces_count: 0,
          premium: false
        }
      });
    });
  });
});
