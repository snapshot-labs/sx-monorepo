// @vitest-environment happy-dom
import {
  onlineManager,
  QueryClient,
  VUE_QUERY_CLIENT
} from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick, ref } from 'vue';
import {
  PROPOSALS_KEYS,
  PROPOSALS_SUMMARY_LIMIT,
  useProposalsSummaryQuery
} from './proposals';

const loadProposalsMock = vi.fn();

vi.mock('@/networks', () => ({
  getNetwork: () => ({
    currentChainId: 1,
    api: { loadProposals: (...args: any[]) => loadProposalsMock(...args) }
  }),
  offchainNetworks: ['s'],
  evmNetworks: []
}));

vi.mock('@/helpers/provider', () => ({
  getProvider: () => ({ getBlockNumber: async () => 1 })
}));

vi.mock('@/helpers/stamp', () => ({
  getNames: async () => ({})
}));

function proposalOf(spaceId: string) {
  return {
    id: `${spaceId}-1`,
    proposal_id: 1,
    space: { id: spaceId },
    author: { id: '0xauthor' }
  };
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});
queryClient.mount();

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
  loadProposalsMock.mockReset();
  loadProposalsMock.mockImplementation(async (spaceIds: string[]) => [
    proposalOf(spaceIds[0])
  ]);
});

afterEach(() => {
  testApp?.unmount();
  onlineManager.setOnline(true);
});

describe('useProposalsSummaryQuery', () => {
  it('should fetch the proposals of the space it is given', async () => {
    const { data } = withSetup(() =>
      useProposalsSummaryQuery(ref('s'), ref('space-a.eth'))
    );

    await vi.waitFor(() => {
      expect(data.value).toEqual([proposalOf('space-a.eth')]);
    });
    expect(loadProposalsMock).toHaveBeenCalledWith(
      ['space-a.eth'],
      { limit: PROPOSALS_SUMMARY_LIMIT, skip: 0 },
      expect.any(Number),
      undefined,
      undefined
    );
  });

  it('should follow the space when it changes without the consumer remounting', async () => {
    const spaceId = ref('space-a.eth');

    const { data } = withSetup(() =>
      useProposalsSummaryQuery(ref('s'), spaceId)
    );

    await vi.waitFor(() => {
      expect(data.value).toEqual([proposalOf('space-a.eth')]);
    });

    spaceId.value = 'space-b.eth';

    await vi.waitFor(() => {
      expect(data.value).toEqual([proposalOf('space-b.eth')]);
    });

    expect(loadProposalsMock).toHaveBeenLastCalledWith(
      ['space-b.eth'],
      { limit: PROPOSALS_SUMMARY_LIMIT, skip: 0 },
      expect.any(Number),
      undefined,
      undefined
    );
    expect(
      queryClient.getQueryData(PROPOSALS_KEYS.spaceSummary('s', 'space-b.eth'))
    ).toEqual([proposalOf('space-b.eth')]);
  });

  it('should keep the data of a fetch paused while offline under the space it was requested for', async () => {
    onlineManager.setOnline(false);

    const spaceId = ref('space-a.eth');

    const { fetchStatus } = withSetup(() =>
      useProposalsSummaryQuery(ref('s'), spaceId)
    );

    await vi.waitFor(() => {
      expect(fetchStatus.value).toBe('paused');
    });

    spaceId.value = 'space-b.eth';
    await nextTick();
    spaceId.value = 'space-c.eth';
    await nextTick();

    onlineManager.setOnline(true);

    const dataOf = (id: string) =>
      queryClient.getQueryData(PROPOSALS_KEYS.spaceSummary('s', id));

    await vi.waitFor(() => {
      expect(dataOf('space-a.eth')).toBeDefined();
      expect(dataOf('space-b.eth')).toBeDefined();
      expect(dataOf('space-c.eth')).toBeDefined();
    });

    expect(dataOf('space-a.eth')).toEqual([proposalOf('space-a.eth')]);
    expect(dataOf('space-b.eth')).toEqual([proposalOf('space-b.eth')]);
    expect(dataOf('space-c.eth')).toEqual([proposalOf('space-c.eth')]);
  });

  it('should not fetch while disabled', async () => {
    const isEnabled = ref(false);

    const { data, fetchStatus } = withSetup(() =>
      useProposalsSummaryQuery(ref('s'), ref('space-a.eth'), isEnabled)
    );

    await nextTick();
    expect(fetchStatus.value).toBe('idle');
    expect(loadProposalsMock).not.toHaveBeenCalled();

    isEnabled.value = true;

    await vi.waitFor(() => {
      expect(data.value).toEqual([proposalOf('space-a.eth')]);
    });
  });
});
