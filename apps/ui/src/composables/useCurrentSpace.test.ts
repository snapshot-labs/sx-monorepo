import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, nextTick, reactive, ref } from 'vue';
import { useCurrentSpace } from './useCurrentSpace';

const VALID_ADDRESS = '0x000000000000000000000000000000000000dEaD';
const CHECKSUMMED = '0x000000000000000000000000000000000000dEaD';

let mockRoute: { params: Record<string, string> };
const mockWhiteLabelSpace = ref<any>(null);
let spaceQueryArgs: { networkId: () => any; spaceId: () => any };

let resolveQueryData: any;
let resolveQueryFetching: any;

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute
}));

vi.mock('@/composables/useWhiteLabel', () => ({
  useWhiteLabel: () => ({ space: mockWhiteLabelSpace })
}));

vi.mock('@/queries/spaces', () => ({
  useSpaceQuery: (args: any) => {
    spaceQueryArgs = args;
    return { data: ref(null), isFetching: ref(false) };
  }
}));

vi.mock('@tanstack/vue-query', () => ({
  skipToken: Symbol('skipToken'),
  useQuery: (opts: any) => {
    resolveQueryData = ref(undefined);
    resolveQueryFetching = ref(false);

    const queryFn = computed(() =>
      typeof opts.queryFn === 'object' && 'value' in opts.queryFn
        ? opts.queryFn.value
        : opts.queryFn
    );

    watchEffect(async () => {
      const fn = queryFn.value;
      if (!fn || typeof fn === 'symbol') {
        resolveQueryData.value = undefined;
        resolveQueryFetching.value = false;
        return;
      }
      resolveQueryFetching.value = true;
      try {
        resolveQueryData.value = await fn();
      } catch {
        resolveQueryData.value = undefined;
      } finally {
        resolveQueryFetching.value = false;
      }
    });

    return { data: resolveQueryData, isFetching: resolveQueryFetching };
  }
}));

const resolveNameMock = vi.fn();
vi.mock('@/helpers/resolver', () => ({
  resolver: { resolveName: (...args: any[]) => resolveNameMock(...args) }
}));

beforeEach(() => {
  mockRoute = reactive({ params: {} });
  mockWhiteLabelSpace.value = null;
  resolveNameMock.mockReset();
});

describe('useCurrentSpace', () => {
  describe('param parsing', () => {
    it('should return null space when no route param', () => {
      const { space } = useCurrentSpace();

      expect(space.value).toBe(null);
      expect(spaceQueryArgs.networkId()).toBe(null);
      expect(spaceQueryArgs.spaceId()).toBe(null);
    });

    it('should pass parsed networkId and address to query for direct addresses', async () => {
      mockRoute.params = { space: `eth:${VALID_ADDRESS}` };
      useCurrentSpace();

      await vi.waitFor(() => {
        expect(spaceQueryArgs.networkId()).toBe('eth');
        expect(spaceQueryArgs.spaceId()).toBe(CHECKSUMMED);
      });
      expect(resolveNameMock).not.toHaveBeenCalled();
    });

    it('should handle malformed param without colon', async () => {
      mockRoute.params = { space: 'ethonly' };
      useCurrentSpace();
      await nextTick();

      expect(spaceQueryArgs.networkId()).toBe(null);
      expect(spaceQueryArgs.spaceId()).toBe(null);
    });

    it('should handle param with empty name segment', async () => {
      mockRoute.params = { space: 'eth:' };
      useCurrentSpace();
      await nextTick();

      expect(spaceQueryArgs.networkId()).toBe(null);
      expect(spaceQueryArgs.spaceId()).toBe(null);
    });
  });

  describe('ENS resolution', () => {
    it('should resolve ENS names and pass result to query', async () => {
      resolveNameMock.mockResolvedValue({
        networkId: 'eth',
        address: VALID_ADDRESS
      });

      mockRoute.params = { space: 'eth:vitalik.eth' };
      useCurrentSpace();

      expect(resolveNameMock).toHaveBeenCalledWith('vitalik.eth', 'eth');

      await vi.waitFor(() => {
        expect(spaceQueryArgs.networkId()).toBe('eth');
        expect(spaceQueryArgs.spaceId()).toBe(CHECKSUMMED);
      });
    });

    it('should leave query disabled when resolution throws', async () => {
      resolveNameMock.mockResolvedValue(null);

      mockRoute.params = { space: 'eth:unknown.eth' };
      useCurrentSpace();

      await vi.waitFor(() => {
        expect(resolveNameMock).toHaveBeenCalled();
      });

      expect(spaceQueryArgs.networkId()).toBe(null);
      expect(spaceQueryArgs.spaceId()).toBe(null);
    });

    it('should set isPending true during resolution and false after', async () => {
      let resolve: (v: any) => void;
      resolveNameMock.mockReturnValue(
        new Promise(r => {
          resolve = r;
        })
      );

      mockRoute.params = { space: 'eth:test.eth' };
      const { isPending } = useCurrentSpace();
      await nextTick();

      expect(isPending.value).toBe(true);

      resolve!({ networkId: 'eth', address: VALID_ADDRESS });
      await vi.waitFor(() => {
        expect(isPending.value).toBe(false);
      });
    });
  });

  describe('race conditions', () => {
    it('should use latest param result via query key change', async () => {
      resolveNameMock.mockResolvedValue({
        networkId: 'eth',
        address: '0x0000000000000000000000000000000000000001'
      });

      mockRoute.params = { space: 'eth:first.eth' };
      useCurrentSpace();
      await nextTick();

      // Change to a direct address — query key changes, stale ENS result discarded
      mockRoute.params = { space: `eth:${VALID_ADDRESS}` };

      await vi.waitFor(() => {
        expect(spaceQueryArgs.spaceId()).toBe(CHECKSUMMED);
      });
    });
  });

  describe('error handling', () => {
    it('should reset spaceId when resolveName throws', async () => {
      resolveNameMock.mockResolvedValueOnce({
        networkId: 'eth',
        address: VALID_ADDRESS
      });

      mockRoute.params = { space: 'eth:first.eth' };
      useCurrentSpace();

      await vi.waitFor(() => {
        expect(spaceQueryArgs.spaceId()).toBe(CHECKSUMMED);
      });

      // Second resolution fails — queryFn throws, data resets
      resolveNameMock.mockRejectedValue(new Error('network error'));
      mockRoute.params = { space: 'eth:failing.eth' };

      await vi.waitFor(() => {
        expect(spaceQueryArgs.networkId()).toBe(null);
        expect(spaceQueryArgs.spaceId()).toBe(null);
      });
    });
  });

  describe('white-label override', () => {
    it('should skip param parsing and use white-label space directly', async () => {
      const wlSpace = { network: 'eth', id: '0xWL' };
      mockWhiteLabelSpace.value = wlSpace;

      mockRoute.params = { space: 'eth:should-be-ignored.eth' };
      const { space } = useCurrentSpace();
      await nextTick();

      expect(space.value).toEqual(wlSpace);
      expect(resolveNameMock).not.toHaveBeenCalled();
      expect(spaceQueryArgs.networkId()).toBe(null);
    });
  });
});
