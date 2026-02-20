import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, reactive, ref } from 'vue';
import { useCurrentSpace } from './useCurrentSpace';

const VALID_ADDRESS = '0x000000000000000000000000000000000000dEaD';
const CHECKSUMMED = '0x000000000000000000000000000000000000dEaD';

let mockRoute: { params: Record<string, string> };
const mockWhiteLabelSpace = ref<any>(null);
let spaceQueryArgs: { networkId: () => any; spaceId: () => any };

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute
}));

vi.mock('@/composables/useWhiteLabel', () => ({
  useWhiteLabel: () => ({ space: mockWhiteLabelSpace })
}));

vi.mock('@/queries/spaces', () => ({
  useSpaceQuery: (args: any) => {
    spaceQueryArgs = args;
    return { data: ref(null), isPending: ref(false) };
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
      const { space, isPending } = useCurrentSpace();

      expect(space.value).toBe(null);
      expect(isPending.value).toBe(false);
      expect(spaceQueryArgs.networkId()).toBe(null);
      expect(spaceQueryArgs.spaceId()).toBe(null);
    });

    it('should pass parsed networkId and address to query for direct addresses', async () => {
      mockRoute.params = { space: `eth:${VALID_ADDRESS}` };
      const { isPending } = useCurrentSpace();
      await nextTick();

      expect(spaceQueryArgs.networkId()).toBe('eth');
      expect(spaceQueryArgs.spaceId()).toBe(CHECKSUMMED);
      expect(isPending.value).toBe(false);
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
      let resolve: (v: any) => void;
      resolveNameMock.mockReturnValue(
        new Promise(r => {
          resolve = r;
        })
      );

      mockRoute.params = { space: 'eth:vitalik.eth' };
      const { isPending } = useCurrentSpace();
      await nextTick();

      expect(isPending.value).toBe(true);
      expect(resolveNameMock).toHaveBeenCalledWith('vitalik.eth', 'eth');

      resolve!({ networkId: 'eth', address: VALID_ADDRESS });
      await vi.waitFor(() => {
        expect(spaceQueryArgs.networkId()).toBe('eth');
        expect(spaceQueryArgs.spaceId()).toBe(CHECKSUMMED);
      });
    });

    it('should leave query disabled when resolution returns null', async () => {
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
    it('should discard stale resolution results on rapid param changes', async () => {
      let resolve: (v: any) => void;
      resolveNameMock.mockReturnValue(
        new Promise(r => {
          resolve = r;
        })
      );

      mockRoute.params = { space: 'eth:first.eth' };
      useCurrentSpace();
      await nextTick();

      mockRoute.params = { space: `eth:${VALID_ADDRESS}` };
      await nextTick();

      expect(spaceQueryArgs.spaceId()).toBe(CHECKSUMMED);

      // Stale ENS result arrives — should be ignored
      resolve!({
        networkId: 'eth',
        address: '0x0000000000000000000000000000000000000001'
      });
      await nextTick();

      expect(spaceQueryArgs.spaceId()).toBe(CHECKSUMMED);
    });
  });

  describe('error handling', () => {
    it('should reset isPending and spaceId when resolveName throws', async () => {
      let resolve: (v: any) => void;
      resolveNameMock.mockReturnValueOnce(
        new Promise(r => {
          resolve = r;
        })
      );

      mockRoute.params = { space: 'eth:first.eth' };
      const { isPending } = useCurrentSpace();

      // First resolution succeeds
      resolve!({ networkId: 'eth', address: VALID_ADDRESS });
      await vi.waitFor(() => {
        expect(spaceQueryArgs.spaceId()).toBe(CHECKSUMMED);
      });

      // Second resolution fails
      resolveNameMock.mockRejectedValue(new Error('network error'));
      mockRoute.params = { space: 'eth:failing.eth' };

      await vi.waitFor(() => {
        expect(isPending.value).toBe(false);
      });

      expect(spaceQueryArgs.networkId()).toBe(null);
      expect(spaceQueryArgs.spaceId()).toBe(null);
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
