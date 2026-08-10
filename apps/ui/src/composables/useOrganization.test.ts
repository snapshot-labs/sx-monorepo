// @vitest-environment happy-dom
import { QueryClient, VUE_QUERY_CLIENT } from '@tanstack/vue-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, reactive } from 'vue';

const SX_SPACE = { id: '0xSX', network: 'eth' };
const OFFCHAIN_SPACE = { id: 'testorg.eth', network: 's' };

const ORG_CONFIG = {
  id: 'testorg',
  name: 'Test Org',
  spaceIds: [
    { network: 'eth', id: '0xSX' },
    { network: 's', id: 'testorg.eth' }
  ]
};

let mockRoute: { params: Record<string, string>; matched: { name: string }[] };
const loadSpaceMock = vi.fn();

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute
}));

vi.mock('@/queries/spaces', () => ({
  SPACES_KEYS: {
    all: ['spaces'],
    detail: (spaceId: string) => ['spaces', 'detail', spaceId]
  },
  spaceQueryFn: (networkId: string, spaceId: string) => () =>
    loadSpaceMock(networkId, spaceId)
}));

vi.mock('@/helpers/organizations', () => ({
  getOrganizationConfigByDomain: () => null,
  getOrganizationConfigById: (id: string) =>
    id === ORG_CONFIG.id ? ORG_CONFIG : null
}));

let queryClient: QueryClient;
let testApp: ReturnType<typeof createApp>;

async function withSetup() {
  const { useOrganization } = await import('./useOrganization');

  let result!: ReturnType<typeof useOrganization>;
  testApp = createApp({
    setup() {
      result = useOrganization();
      return () => null;
    }
  });
  testApp.provide(VUE_QUERY_CLIENT, queryClient);
  testApp.mount(document.createElement('div'));
  return result;
}

beforeEach(() => {
  // useOrganization is a shared composable, so it must be re-imported per test
  vi.resetModules();
  loadSpaceMock.mockReset();
  mockRoute = reactive({
    params: { org: ORG_CONFIG.id },
    matched: [{ name: 'org' }]
  });
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } }
  });
});

afterEach(() => {
  testApp?.unmount();
  queryClient.clear();
});

describe('useOrganization', () => {
  it('should load every space of the organization', async () => {
    loadSpaceMock.mockImplementation(async (networkId: string) =>
      networkId === 'eth' ? SX_SPACE : OFFCHAIN_SPACE
    );

    const { organization } = await withSetup();

    await vi.waitFor(() => expect(organization.value).not.toBe(null));
    expect(organization.value?.spaces).toEqual([SX_SPACE, OFFCHAIN_SPACE]);
  });

  it('should cache every space under its space detail query key', async () => {
    loadSpaceMock.mockImplementation(async (networkId: string) =>
      networkId === 'eth' ? SX_SPACE : OFFCHAIN_SPACE
    );

    const { organization } = await withSetup();

    await vi.waitFor(() => expect(organization.value).not.toBe(null));
    expect(queryClient.getQueryData(['spaces', 'detail', 'eth:0xSX'])).toEqual(
      SX_SPACE
    );
    expect(
      queryClient.getQueryData(['spaces', 'detail', 's:testorg.eth'])
    ).toEqual(OFFCHAIN_SPACE);
  });

  it('should keep remaining spaces when one space resolves to null', async () => {
    loadSpaceMock.mockImplementation(async (networkId: string) =>
      networkId === 'eth' ? null : OFFCHAIN_SPACE
    );

    const { organization } = await withSetup();

    await vi.waitFor(() => expect(organization.value).not.toBe(null));
    expect(organization.value?.spaces).toEqual([OFFCHAIN_SPACE]);
  });

  // Regression: a rejecting space query (e.g. space metadata not indexed yet)
  // used to reject the whole Promise.all, leaving organization null forever.
  it('should keep remaining spaces when one space fails to load', async () => {
    loadSpaceMock.mockImplementation(async (networkId: string) => {
      if (networkId === 'eth') throw new Error('metadata not indexed');
      return OFFCHAIN_SPACE;
    });

    const { organization, isLoading } = await withSetup();

    await vi.waitFor(() => expect(organization.value).not.toBe(null));
    expect(organization.value?.spaces).toEqual([OFFCHAIN_SPACE]);
    expect(isLoading.value).toBe(false);
  });

  it('should resolve with no spaces when every space fails to load', async () => {
    loadSpaceMock.mockRejectedValue(new Error('API down'));

    const { organization, isLoading } = await withSetup();

    await vi.waitFor(() => expect(organization.value).not.toBe(null));
    expect(organization.value?.spaces).toEqual([]);
    expect(isLoading.value).toBe(false);
  });

  it('should not wait for the retries of a space that failed', async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: 3, retryDelay: 60_000, gcTime: Infinity }
      }
    });
    loadSpaceMock.mockImplementation(async (networkId: string) => {
      if (networkId === 'eth') throw new Error('metadata not indexed');
      return OFFCHAIN_SPACE;
    });

    const { organization, isLoading } = await withSetup();

    await vi.waitFor(() => expect(organization.value).not.toBe(null));
    expect(organization.value?.spaces).toEqual([OFFCHAIN_SPACE]);
    expect(isLoading.value).toBe(false);
  });

  it('should not expose an empty organization before its queries are created', async () => {
    mockRoute = reactive({ params: {}, matched: [{ name: 'home' }] });
    loadSpaceMock.mockResolvedValue(OFFCHAIN_SPACE);

    const { organization, isLoading } = await withSetup();
    expect(organization.value).toBe(null);

    mockRoute.matched = [{ name: 'org' }];
    mockRoute.params = { org: ORG_CONFIG.id };

    expect(isLoading.value).toBe(true);
    expect(organization.value).toBe(null);
  });

  it('should not expose the organization until every space settled', async () => {
    let resolveOffchainSpace!: (space: unknown) => void;
    loadSpaceMock.mockImplementation(async (networkId: string) => {
      if (networkId === 'eth') return SX_SPACE;

      return new Promise(resolve => {
        resolveOffchainSpace = resolve;
      });
    });

    const { organization, isLoading } = await withSetup();

    await vi.waitFor(() => expect(loadSpaceMock).toHaveBeenCalledTimes(2));
    expect(organization.value).toBe(null);
    expect(isLoading.value).toBe(true);

    resolveOffchainSpace(OFFCHAIN_SPACE);

    await vi.waitFor(() => expect(organization.value).not.toBe(null));
    expect(organization.value?.spaces).toEqual([SX_SPACE, OFFCHAIN_SPACE]);
  });
});
