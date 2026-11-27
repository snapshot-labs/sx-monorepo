// @vitest-environment happy-dom
import { QueryClient, VUE_QUERY_CLIENT } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, createApp, nextTick, reactive, ref, watch } from 'vue';
import { useFollowedSpacesStore } from '@/stores/followedSpaces';

// Requests (by account or space id) that wait until the test releases them
const gates = new Map<string, Promise<void>>();
function hold(key: string) {
  let release!: () => void;
  gates.set(key, new Promise<void>(resolve => (release = resolve)));
  return release;
}

const followsByAccount: Record<string, string[]> = {};
const loadFollows = vi.fn(async (account: string) => {
  await gates.get(account);
  return (followsByAccount[account] ?? []).map(id => ({
    space: { id, network: 's' }
  }));
});
const loadSpaces = vi.fn(async (_: unknown, filter: { id_in?: string[] }) => {
  const ids = filter.id_in ?? [];
  await Promise.all(ids.map(id => gates.get(id)));
  return ids.map(id => ({ id, network: 's' }));
});

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
let store: ReturnType<typeof useFollowedSpacesStore> | undefined;

function setupStore() {
  testApp = createApp({
    setup() {
      store = useFollowedSpacesStore();
      return () => null;
    }
  });
  testApp.use(createPinia());
  testApp.provide(VUE_QUERY_CLIENT, queryClient);
  testApp.mount(document.createElement('div'));
  return store!;
}

async function switchTo(account: string) {
  state.account = account;
  await nextTick();
}

beforeEach(() => {
  queryClient.clear();
  localStorage.clear();
  state.account = '';
  for (const key of Object.keys(followsByAccount)) delete followsByAccount[key];
  gates.clear();
  loadFollows.mockClear();
  loadSpaces.mockClear();
});

afterEach(() => {
  // Unmounting the app leaves Pinia's store scope (and its queries) running
  store?.$dispose();
  store = undefined;
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
      const release = hold('0xb');
      const store = setupStore();

      await switchTo('0xa');
      await vi.waitFor(() => expect(store.followedSpacesLoaded).toBe(true));

      await switchTo('0xb');
      await vi.waitFor(() => expect(loadFollows).toHaveBeenCalledWith('0xb'));
      expect(store.followedSpacesLoaded).toBe(false);

      release();
      await vi.waitFor(() => expect(store.followedSpacesLoaded).toBe(true));
      expect(store.followedSpacesIds).toEqual(spaces.map(id => `s:${id}`));
    }
  );

  it('should keep loading while the new account spaces are in flight', async () => {
    followsByAccount['0xa'] = ['ens.eth'];
    followsByAccount['0xb'] = ['aave.eth'];
    const release = hold('aave.eth');
    const store = setupStore();

    await switchTo('0xa');
    await vi.waitFor(() => expect(store.followedSpacesLoaded).toBe(true));

    await switchTo('0xb');
    await vi.waitFor(() =>
      expect(store.followedSpacesIds).toEqual(['s:aave.eth'])
    );
    expect(store.followedSpacesLoaded).toBe(false);

    release();
    await vi.waitFor(() => expect(store.followedSpacesLoaded).toBe(true));
  });

  it('should keep loading when coming back to an account whose spaces are in flight', async () => {
    followsByAccount['0xa'] = ['ens.eth'];
    followsByAccount['0xb'] = ['aave.eth'];
    const release = hold('aave.eth');
    const store = setupStore();

    await switchTo('0xa');
    await vi.waitFor(() => expect(store.followedSpacesLoaded).toBe(true));
    await switchTo('0xb');
    await vi.waitFor(() =>
      expect(store.followedSpacesIds).toEqual(['s:aave.eth'])
    );
    await switchTo('0xa');
    await vi.waitFor(() => expect(store.followedSpacesLoaded).toBe(true));

    await switchTo('0xb');
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(store.followedSpacesLoaded).toBe(false);

    release();
    await vi.waitFor(() => expect(store.followedSpacesLoaded).toBe(true));
  });

  it.each([
    ['before', true],
    ['after', false]
  ])(
    'should keep loading when a data update lands in the same tick, %s the account change',
    async (_, isUpdateFirst) => {
      followsByAccount['0xa'] = ['ens.eth'];
      followsByAccount['0xb'] = ['aave.eth'];
      const release = hold('0xb');
      const store = setupStore();

      await switchTo('0xa');
      await vi.waitFor(() => expect(store.followedSpacesLoaded).toBe(true));

      // A refetch of 0xa's spaces lands in the same tick as the account change
      const update = () =>
        queryClient.setQueryData(
          ['spaces', 'followedSpaces', ['s:ens.eth']],
          [{ id: 'ens.eth', network: 's', name: 'ENS' }]
        );
      if (isUpdateFirst) update();
      state.account = '0xb';
      if (!isUpdateFirst) update();
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(store.followedSpacesLoaded).toBe(false);

      release();
      await vi.waitFor(() => expect(store.followedSpacesLoaded).toBe(true));
    }
  );

  it('should be loaded when created with the account spaces already cached', async () => {
    followsByAccount['0xa'] = ['ens.eth'];
    queryClient.setQueryData(['followedSpaces', '0xa'], ['s:ens.eth']);
    queryClient.setQueryData(
      ['spaces', 'followedSpaces', ['s:ens.eth']],
      [{ id: 'ens.eth', network: 's' }]
    );
    state.account = '0xa';

    const store = setupStore();

    expect(store.followedSpacesLoaded).toBe(true);
  });

  it('should not show the previous account spaces when follows fail to load', async () => {
    followsByAccount['0xa'] = ['ens.eth'];
    const store = setupStore();

    await switchTo('0xa');
    await vi.waitFor(() => expect(store.followedSpacesLoaded).toBe(true));

    loadFollows.mockRejectedValueOnce(new Error('hub down'));
    await switchTo('0xb');
    await vi.waitFor(() => expect(loadFollows).toHaveBeenCalledWith('0xb'));
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(store.followedSpacesLoaded).toBe(false);
    expect(store.followedSpacesIds).toEqual([]);
  });

  it('should keep showing loaded spaces while the same account follows another', async () => {
    followsByAccount['0xa'] = ['ens.eth'];
    const release = hold('aave.eth');
    const store = setupStore();

    await switchTo('0xa');
    await vi.waitFor(() => expect(store.followedSpacesLoaded).toBe(true));

    const seen: boolean[] = [];
    const stop = watch(
      () => store.followedSpacesLoaded,
      value => seen.push(value),
      { flush: 'sync' }
    );
    // What toggleSpaceFollow does after a follow
    queryClient.setQueryData<string[]>(['followedSpaces', '0xa'], old => [
      's:aave.eth',
      ...(old ?? [])
    ]);
    await vi.waitFor(() =>
      // ens.eth is already cached, so only the new space is fetched
      expect(loadSpaces).toHaveBeenLastCalledWith(expect.anything(), {
        id_in: ['aave.eth']
      })
    );
    expect(store.followedSpaces.map(space => space.id)).toEqual(['ens.eth']);

    release();
    await vi.waitFor(() =>
      expect(store.followedSpaces.map(space => space.id).sort()).toEqual([
        'aave.eth',
        'ens.eth'
      ])
    );
    stop();
    expect(seen).not.toContain(false);
    expect(store.followedSpacesLoaded).toBe(true);
  });
});
