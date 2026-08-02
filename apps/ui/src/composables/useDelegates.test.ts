import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequiredProperty, Space, SpaceMetadataDelegation } from '@/types';
import { useDelegates } from './useDelegates';

const responses = new Map<string, { delegate: string } | Error>();
const queriedChainIds: string[] = [];

vi.mock('@apollo/client/core', () => {
  class ApolloClient {
    uri: string;

    constructor({ uri }: { uri: string }) {
      this.uri = uri;
    }

    async query() {
      const chainId = this.uri.split('/').pop() as string;
      queriedChainIds.push(chainId);

      const response = responses.get(chainId);
      if (response instanceof Error) throw response;

      return { data: { delegations: response ? [response] : [] } };
    }
  }

  return { ApolloClient, InMemoryCache: class {}, createHttpLink: () => ({}) };
});

function getAccountDelegations(chainIds: string[]) {
  const delegation = {
    name: 'Delegate registry',
    apiType: 'delegate-registry',
    apiUrl: 'https://delegate-registry-api.snapshot.box',
    contractAddress: 'space.eth',
    chainId: chainIds[0],
    chainIds
  } as RequiredProperty<SpaceMetadataDelegation>;

  return useDelegates(delegation, { id: 'space.eth' } as Space)
    .getAccountDelegations;
}

describe('useDelegates', () => {
  beforeEach(() => {
    responses.clear();
    queriedChainIds.length = 0;
  });

  describe('getAccountDelegations', () => {
    it('returns the delegation of every chain holding one', async () => {
      responses.set('100', { delegate: '0xa' });
      responses.set('1', { delegate: '0xb' });

      await expect(
        getAccountDelegations(['100', '1'])('0xdelegator')
      ).resolves.toEqual([
        { delegate: '0xa', chainId: '100' },
        { delegate: '0xb', chainId: '1' }
      ]);
    });

    it('keeps the chainIds order regardless of which chains answer', async () => {
      responses.set('1', { delegate: '0xb' });

      await expect(
        getAccountDelegations(['100', '1'])('0xdelegator')
      ).resolves.toEqual([{ delegate: '0xb', chainId: '1' }]);
    });

    it('returns no delegation when every chain answered with none', async () => {
      await expect(
        getAccountDelegations(['100', '1'])('0xdelegator')
      ).resolves.toEqual([]);
    });

    it('skips chains without a delegation subgraph', async () => {
      responses.set('1', { delegate: '0xb' });

      await expect(
        getAccountDelegations(['999', '1'])('0xdelegator')
      ).resolves.toEqual([{ delegate: '0xb', chainId: '1' }]);
      expect(queriedChainIds).toEqual(['1']);
    });

    it('throws rather than report no delegation when a chain could not be read', async () => {
      responses.set('100', new Error('subgraph down'));

      await expect(
        getAccountDelegations(['100', '1'])('0xdelegator')
      ).rejects.toThrow('subgraph down');
    });

    it('still returns the delegations it found when another chain failed', async () => {
      responses.set('100', new Error('subgraph down'));
      responses.set('1', { delegate: '0xb' });

      await expect(
        getAccountDelegations(['100', '1'])('0xdelegator')
      ).resolves.toEqual([{ delegate: '0xb', chainId: '1' }]);
    });

    it('throws when no chain has a delegation subgraph', async () => {
      await expect(
        getAccountDelegations(['999'])('0xdelegator')
      ).rejects.toThrow('Delegation subgraph not found');
    });
  });
});
