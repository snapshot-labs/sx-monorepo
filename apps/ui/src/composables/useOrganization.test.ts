// @vitest-environment happy-dom
import { QueryClient, VUE_QUERY_CLIENT } from '@tanstack/vue-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, reactive } from 'vue';

const SX_SPACE = { id: '0xSX', network: 'eth' };
const OFFCHAIN_SPACE = { id: 'shutterpen.eth', network: 's' };

const ORG_CONFIG = {
  id: 'shutterpen',
  name: 'Shutter PEN',
  spaceIds: [
    { network: 'eth', id: '0xSX' },
    { network: 's', id: 'shutterpen.eth' }
  ]
};

let mockRoute: { params: Record<string, string>; matched: { name: string }[] };
const loadSpaceMock = vi.fn();

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute
}));

vi.mock('@/networks', () => ({
  getNetwork: (networkId: string) => ({
    api: { loadSpace: (id: string) => loadSpaceMock(networkId, id) }
  })
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

  it('should keep remaining spaces when one space resolves to null', async () => {
    loadSpaceMock.mockImplementation(async (networkId: string) =>
      networkId === 'eth' ? null : OFFCHAIN_SPACE
    );

    const { organization } = await withSetup();

    await vi.waitFor(() => expect(organization.value).not.toBe(null));
    expect(organization.value?.spaces).toEqual([OFFCHAIN_SPACE]);
  });

  // Regression: a rejecting loadSpace (e.g. space metadata not indexed yet)
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
});
