// @vitest-environment happy-dom
import { QueryClient, VUE_QUERY_CLIENT } from '@tanstack/vue-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, createApp, nextTick, reactive, ref } from 'vue';
import { useCurrentSpace } from './useCurrentSpace';

const VALID_ADDRESS = '0x000000000000000000000000000000000000dEaD';
const CHECKSUMMED = '0x000000000000000000000000000000000000dEaD';

let mockRoute: { params: Record<string, string> };
const mockWhiteLabelSpace = ref<any>(null);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: Infinity }
  }
});

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute
}));

vi.mock('@/composables/useWhiteLabel', () => ({
  useWhiteLabel: () => ({ space: mockWhiteLabelSpace })
}));

vi.mock('@/queries/spaces', () => ({
  useSpaceQuery: (args: any) => {
    const data = computed(() => {
      const networkId = args.networkId();
      const spaceId = args.spaceId();
      if (!networkId || !spaceId) return null;
      return { id: `${networkId}:${spaceId}`, network: networkId } as any;
    });
    return { data, isFetching: ref(false) };
  }
}));

const resolveNameMock = vi.fn();
vi.mock('@/helpers/resolver', () => ({
  resolver: { resolveName: (...args: any[]) => resolveNameMock(...args) }
}));

let testApp: ReturnType<typeof createApp>;

function withSetup<T>(composable: () => T): T {
  let result!: T;
  testApp = createApp({
    setup() {
      result = composable();
      return () => null;
    }
  });
  testApp.provide(VUE_QUERY_CLIENT, queryClient);
  testApp.mount(document.createElement('div'));
  return result;
}

beforeEach(() => {
  mockRoute = reactive({ params: {} });
  mockWhiteLabelSpace.value = null;
  resolveNameMock.mockReset();
  queryClient.clear();
});

afterEach(() => {
  testApp?.unmount();
});

describe('useCurrentSpace', () => {
  describe('param parsing', () => {
    it('should return null space when no route param', () => {
      const { space, isPending } = withSetup(() => useCurrentSpace());

      expect(space.value).toBe(null);
      expect(isPending.value).toBe(false);
    });

    it('should resolve direct addresses without calling resolver', async () => {
      mockRoute.params = { space: `eth:${VALID_ADDRESS}` };
      const { space } = withSetup(() => useCurrentSpace());

      await vi.waitFor(() => {
        expect(space.value).toEqual({
          id: `eth:${CHECKSUMMED}`,
          network: 'eth'
        });
      });
      expect(resolveNameMock).not.toHaveBeenCalled();
    });

    it.each(['ethonly', 'eth:'])(
      'should return null space for malformed param "%s"',
      async param => {
        mockRoute.params = { space: param };
        const { space } = withSetup(() => useCurrentSpace());
        await nextTick();

        expect(space.value).toBe(null);
      }
    );
  });

  describe('ENS resolution', () => {
    it('should resolve ENS names and return space', async () => {
      resolveNameMock.mockResolvedValue({
        networkId: 'eth',
        address: VALID_ADDRESS
      });

      mockRoute.params = { space: 'eth:vitalik.eth' };
      const { space } = withSetup(() => useCurrentSpace());

      await vi.waitFor(() => {
        expect(space.value).toEqual({
          id: `eth:${CHECKSUMMED}`,
          network: 'eth'
        });
      });
    });

    it('should return null space when ENS name does not resolve', async () => {
      resolveNameMock.mockResolvedValue(null);

      mockRoute.params = { space: 'eth:unknown.eth' };
      const { space } = withSetup(() => useCurrentSpace());

      await vi.waitFor(() => {
        expect(resolveNameMock).toHaveBeenCalled();
      });

      expect(space.value).toBe(null);
    });

    it('should set isPending during resolution', async () => {
      let resolve: (v: any) => void;
      resolveNameMock.mockReturnValue(
        new Promise(r => {
          resolve = r;
        })
      );

      mockRoute.params = { space: 'eth:test.eth' };
      const { isPending } = withSetup(() => useCurrentSpace());
      await nextTick();

      expect(isPending.value).toBe(true);

      resolve!({ networkId: 'eth', address: VALID_ADDRESS });
      await vi.waitFor(() => {
        expect(isPending.value).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('should return null space when resolver throws', async () => {
      resolveNameMock.mockRejectedValue(new Error('network error'));

      mockRoute.params = { space: 'eth:failing.eth' };
      const { space } = withSetup(() => useCurrentSpace());

      await vi.waitFor(() => {
        expect(resolveNameMock).toHaveBeenCalled();
      });

      expect(space.value).toBe(null);
    });
  });

  describe('white-label override', () => {
    it('should use white-label space and skip resolution', async () => {
      const wlSpace = { network: 'eth', id: '0xWL' };
      mockWhiteLabelSpace.value = wlSpace;

      mockRoute.params = { space: 'eth:should-be-ignored.eth' };
      const { space } = withSetup(() => useCurrentSpace());
      await nextTick();

      expect(space.value).toEqual(wlSpace);
      expect(resolveNameMock).not.toHaveBeenCalled();
    });
  });
});
