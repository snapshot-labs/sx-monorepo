// @vitest-environment happy-dom
import { QueryClient, VUE_QUERY_CLIENT } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, createApp, nextTick, reactive, ref, watch } from 'vue';
import { useFollowedSpacesStore } from '@/stores/followedSpaces';

const followsByAccount: Record<string, string[]> = {};
const loadFollows = vi.fn(async (account: string) =>
  (followsByAccount[account] ?? []).map(id => ({
    space: { id, network: 's' }
  }))
);
const loadSpaces = vi.fn(async (_: unknown, filter: { id_in?: string[] }) =>
  (filter.id_in ?? []).map(id => ({ id, network: 's' }))
);

vi.mock('@/networks', () => ({
  enabledNetworks: ['s'],
  explorePageProtocols: {},
  getNetwork: () => ({
    api: {
      loadFollows: (account: string) => loadFollows(account),
      loadSpaces: (pagination: unknown, filter: { id_in?: string[] }) =>
        loadSpaces(pagination, filter)
    }
  }),
  metadataNetwork: 's',
  offchainNetworks: ['s']
}));

const state = reactive({ account: '', authLoading: false });

vi.mock('@/composables/useWeb3', () => ({
  useWeb3: () => ({ web3: computed(() => state), authInitiated: ref(true) })
}));
vi.mock('@/composables/useActions', () => ({ useActions: () => ({}) }));
vi.mock('@/composables/useWhiteLabel', () => ({
  useWhiteLabel: () => ({ isWhiteLabel: ref(false) })
}));
vi.mock('@/composables/useSettings', () => ({
  useSettings: () => ({ limits: ref({ 'user.default.follow_limit': 25 }) })
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});
let testApp: ReturnType<typeof createApp>;

function setupStore() {
  let store!: ReturnType<typeof useFollowedSpacesStore>;
  testApp = createApp({
    setup() {
      store = useFollowedSpacesStore();
      return () => null;
    }
  });
  testApp.use(createPinia());
  testApp.provide(VUE_QUERY_CLIENT, queryClient);
  testApp.mount(document.createElement('div'));
  return store;
}

async function switchTo(account: string) {
  state.account = account;
  await nextTick();
}

beforeEach(() => {
  queryClient.clear();
  state.account = '';
  for (const key of Object.keys(followsByAccount)) delete followsByAccount[key];
});

afterEach(() => {
  testApp?.unmount();
});

describe('useFollowedSpacesStore', () => {
  it.each([
    ['no spaces', []],
    ['the same spaces', ['ens.eth']]
  ])(
    'should finish loading after switching to an account following %s',
    async (_, spaces) => {
      followsByAccount['0xa'] = spaces;
      followsByAccount['0xb'] = spaces;
      const store = setupStore();

      await switchTo('0xa');
      await vi.waitFor(() => expect(store.followedSpacesLoaded).toBe(true));

      await switchTo('0xb');
      await vi.waitFor(() => expect(loadFollows).toHaveBeenCalledWith('0xb'));
      await vi.waitFor(() => expect(store.followedSpacesLoaded).toBe(true));
    }
  );

  it('should show loading until the new account spaces are loaded', async () => {
    followsByAccount['0xa'] = ['ens.eth'];
    followsByAccount['0xb'] = ['aave.eth'];
    const store = setupStore();

    await switchTo('0xa');
    await vi.waitFor(() => expect(store.followedSpacesLoaded).toBe(true));

    await switchTo('0xb');
    expect(store.followedSpacesLoaded).toBe(false);
    await vi.waitFor(() =>
      expect(store.followedSpacesIds).toEqual(['s:aave.eth'])
    );
    await vi.waitFor(() => expect(store.followedSpacesLoaded).toBe(true));
  });

  it('should keep showing loaded data while the same account refetches', async () => {
    followsByAccount['0xa'] = ['ens.eth'];
    const store = setupStore();

    await switchTo('0xa');
    await vi.waitFor(() => expect(store.followedSpacesLoaded).toBe(true));

    const seen: boolean[] = [];
    watch(
      () => store.followedSpacesLoaded,
      value => seen.push(value),
      { flush: 'sync' }
    );
    queryClient.setQueryData(['followedSpaces', '0xa'], ['s:aave.eth']);
    await vi.waitFor(() =>
      expect(loadSpaces).toHaveBeenLastCalledWith(expect.anything(), {
        id_in: ['aave.eth']
      })
    );
    await nextTick();

    expect(seen).not.toContain(false);
    expect(store.followedSpacesLoaded).toBe(true);
  });
});
