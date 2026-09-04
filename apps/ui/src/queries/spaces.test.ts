// @vitest-environment happy-dom
import { QueryClient, VUE_QUERY_CLIENT } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick, ref } from 'vue';
import { Space } from '@/types';
import { useOrgsActiveProposalsQuery } from './spaces';

const ENS_ONCHAIN = '0x323A76393544d5ecca80cd6ef2A560C6a395b7E3';
const ARBITRUM_ONCHAIN = [
  '0x789fC99093B09aD01C34DC7251D0C89ce743e5a4',
  '0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9'
];

const ALL_NETWORKS = ['s', 'eth', 'arb1', 'sn'];

// `enabledNetworks` is mutable so a test can simulate a build shipping without
// the networks the organization configs point at.
const { loadSpacesMock, enabledNetworks } = vi.hoisted(() => ({
  loadSpacesMock: vi.fn(),
  enabledNetworks: [] as string[]
}));

vi.mock('@/networks', () => ({
  getNetwork: (id: string) => {
    if (!enabledNetworks.includes(id)) {
      throw new Error(`Network ${id} is not enabled`);
    }

    return {
      api: { loadSpaces: (...args: any[]) => loadSpacesMock(id, ...args) }
    };
  },
  enabledNetworks,
  explorePageProtocols: {},
  offchainNetworks: ['s', 's-tn'],
  onchainApiNetwork: 'eth'
}));

function spaceOf(
  network: Space['network'],
  id: string,
  active_proposals: number | null
): Space {
  return { network, id, active_proposals } as Space;
}

function callFor(networkId: string) {
  return loadSpacesMock.mock.calls.find(([id]) => id === networkId);
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

let testApp: ReturnType<typeof createApp>;

function withSetup<T>(composable: () => T): T {
  let result!: T;
  testApp = createApp({
    setup() {
      result = composable();
      return () => null;
    }
  });
  testApp.use(createPinia());
  testApp.provide(VUE_QUERY_CLIENT, queryClient);
  testApp.mount(document.createElement('div'));
  return result;
}

beforeEach(() => {
  queryClient.clear();
  loadSpacesMock.mockReset();
  enabledNetworks.splice(0, enabledNetworks.length, ...ALL_NETWORKS);
});

afterEach(() => {
  testApp?.unmount();
});

describe('useOrgsActiveProposalsQuery', () => {
  it('does not fetch when no followed space belongs to an org', async () => {
    const { fetchStatus, data } = withSetup(() =>
      useOrgsActiveProposalsQuery({
        followedSpaces: ref([spaceOf('s', 'random.eth', 4)])
      })
    );

    await nextTick();
    await nextTick();

    expect(fetchStatus.value).toBe('idle');
    expect(loadSpacesMock).not.toHaveBeenCalled();
    expect(data.value).toBeUndefined();
  });

  it('sums active proposals across every sibling of a followed org', async () => {
    loadSpacesMock.mockImplementation(async (networkId: string) =>
      networkId === 'eth'
        ? [spaceOf('eth', ENS_ONCHAIN, 3)]
        : [spaceOf('s', 'ens.eth', 2)]
    );

    const { data } = withSetup(() =>
      useOrgsActiveProposalsQuery({
        followedSpaces: ref([spaceOf('s', 'ens.eth', 2)])
      })
    );

    await vi.waitFor(() => {
      expect(data.value).toEqual({ ens: 5 });
    });

    expect(loadSpacesMock).toHaveBeenCalledTimes(2);
    expect(loadSpacesMock).toHaveBeenCalledWith(
      'eth',
      { skip: 0, limit: 1000 },
      { id_in: [ENS_ONCHAIN] }
    );
    expect(loadSpacesMock).toHaveBeenCalledWith(
      's',
      { skip: 0, limit: 1000 },
      { id_in: ['ens.eth'] }
    );
  });

  it('treats a missing or null count as zero', async () => {
    loadSpacesMock.mockImplementation(async (networkId: string) =>
      networkId === 'eth' ? [spaceOf('eth', ENS_ONCHAIN, null)] : []
    );

    const { data } = withSetup(() =>
      useOrgsActiveProposalsQuery({
        followedSpaces: ref([spaceOf('s', 'ens.eth', 0)])
      })
    );

    await vi.waitFor(() => {
      expect(data.value).toEqual({ ens: 0 });
    });
  });

  it('batches the siblings of every followed org into one request per api', async () => {
    loadSpacesMock.mockResolvedValue([]);

    withSetup(() =>
      useOrgsActiveProposalsQuery({
        followedSpaces: ref([
          spaceOf('s', 'ens.eth', 0),
          spaceOf('s', 'arbitrumfoundation.eth', 0)
        ])
      })
    );

    await vi.waitFor(() => {
      expect(loadSpacesMock).toHaveBeenCalledTimes(2);
    });

    // `arb1` siblings go through the `eth` api: both are served by the same
    // sx-api, and the request isn't scoped to a single indexer.
    expect(callFor('eth')?.[2].id_in).toEqual([
      ENS_ONCHAIN,
      ...ARBITRUM_ONCHAIN
    ]);
    expect(callFor('s')?.[2].id_in).toEqual([
      'ens.eth',
      'arbitrumfoundation.eth'
    ]);
  });

  it('requests each sibling once when two spaces of one org are followed', async () => {
    loadSpacesMock.mockResolvedValue([]);

    withSetup(() =>
      useOrgsActiveProposalsQuery({
        followedSpaces: ref([
          spaceOf('s', 'ens.eth', 0),
          spaceOf('eth', ENS_ONCHAIN, 0)
        ])
      })
    );

    await vi.waitFor(() => {
      expect(loadSpacesMock).toHaveBeenCalledTimes(2);
    });

    expect(callFor('eth')?.[2].id_in).toEqual([ENS_ONCHAIN]);
    expect(callFor('s')?.[2].id_in).toEqual(['ens.eth']);
  });

  it('skips siblings on networks this build does not enable', async () => {
    enabledNetworks.splice(0, enabledNetworks.length, 's');
    loadSpacesMock.mockResolvedValue([spaceOf('s', 'ens.eth', 2)]);

    const { data } = withSetup(() =>
      useOrgsActiveProposalsQuery({
        followedSpaces: ref([spaceOf('s', 'ens.eth', 2)])
      })
    );

    await vi.waitFor(() => {
      expect(data.value).toEqual({ ens: 2 });
    });

    expect(loadSpacesMock).toHaveBeenCalledTimes(1);
    expect(callFor('s')?.[2].id_in).toEqual(['ens.eth']);
  });

  it('refetches when a new org is followed', async () => {
    loadSpacesMock.mockResolvedValue([]);
    const followedSpaces = ref([spaceOf('s', 'ens.eth', 0)]);

    const { data } = withSetup(() =>
      useOrgsActiveProposalsQuery({ followedSpaces })
    );

    await vi.waitFor(() => {
      expect(data.value).toEqual({ ens: 0 });
    });

    followedSpaces.value = [
      ...followedSpaces.value,
      spaceOf('s', 'arbitrumfoundation.eth', 0)
    ];

    await vi.waitFor(() => {
      expect(data.value).toEqual({ ens: 0, arbitrum: 0 });
    });
  });

  it('does not refetch when the followed orgs are unchanged', async () => {
    loadSpacesMock.mockResolvedValue([]);
    const followedSpaces = ref([
      spaceOf('s', 'ens.eth', 0),
      spaceOf('s', 'arbitrumfoundation.eth', 0)
    ]);

    const { data } = withSetup(() =>
      useOrgsActiveProposalsQuery({ followedSpaces })
    );

    await vi.waitFor(() => {
      expect(data.value).toEqual({ ens: 0, arbitrum: 0 });
    });

    const callCount = loadSpacesMock.mock.calls.length;
    followedSpaces.value = [...followedSpaces.value].reverse();
    await nextTick();
    await nextTick();

    expect(loadSpacesMock).toHaveBeenCalledTimes(callCount);
  });
});
