import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDelegates } from './useDelegates';

const queriedChains: string[] = [];
const responses = new Map<string, string>();
const rejectChains = new Set<string>();

vi.mock('@apollo/client/core', () => {
  class ApolloClient {
    uri?: string;

    constructor(opts: any) {
      this.uri = opts?.uri;
    }

    async query() {
      const chainId = this.uri?.split('/').pop() ?? '';
      queriedChains.push(chainId);
      if (rejectChains.has(chainId)) {
        throw new Error(`subgraph ${chainId} down`);
      }
      const delegate = responses.get(chainId);
      return {
        data: {
          delegations: delegate ? [{ id: `${chainId}:d`, delegate }] : []
        }
      };
    }
  }

  return {
    ApolloClient,
    InMemoryCache: class {},
    createHttpLink: () => ({})
  };
});

function setup(chainIds: string[]) {
  return useDelegates(
    {
      name: 'Delegate registry',
      apiType: 'delegate-registry',
      apiUrl: 'https://delegate-registry-api.snapshot.box',
      contractAddress: 'space.eth',
      chainId: chainIds[0],
      chainIds
    } as any,
    {} as any
  );
}

describe('useDelegates', () => {
  beforeEach(() => {
    queriedChains.length = 0;
    responses.clear();
    rejectChains.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDelegation', () => {
    it('probes every candidate chain in parallel and keeps chainIds order', async () => {
      responses.set('1', '0xAAA');
      responses.set('100', '0xBBB');

      const { getDelegation } = setup(['1', '100']);
      const result = await getDelegation('0xdelegator');

      // Promise.all probes all chains (a serial short-circuit would stop after
      // the first hit); results.find keeps chainIds order, so chain 1 wins.
      expect(queriedChains).toContain('1');
      expect(queriedChains).toContain('100');
      expect(result).toEqual({ id: '1:d', delegate: '0xAAA' });
    });

    it('returns the first non-empty result following chainIds order', async () => {
      responses.set('100', '0xBBB');

      const { getDelegation } = setup(['1', '100']);
      const result = await getDelegation('0xdelegator');

      expect(result).toEqual({ id: '100:d', delegate: '0xBBB' });
    });

    it('ignores a failing chain and returns a delegation on a healthy one', async () => {
      rejectChains.add('1');
      responses.set('100', '0xBBB');

      const { getDelegation } = setup(['1', '100']);
      const result = await getDelegation('0xdelegator');

      // A single rejecting subgraph (Promise.all would throw) must not hide the
      // delegation that lives on the healthy chain.
      expect(result).toEqual({ id: '100:d', delegate: '0xBBB' });
    });

    it('warns and skips chains without a delegation subgraph', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { getDelegation } = setup(['999']);
      const result = await getDelegation('0xdelegator');

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('999'));
      expect(queriedChains).toEqual([]);
      expect(result).toBeNull();
    });
  });
});
