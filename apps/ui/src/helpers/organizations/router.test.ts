// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouteRecordRaw } from 'vue-router';
import {
  getOrganizationConfigByDomain,
  OrganizationConfig,
  SpaceRoute
} from './config';
import {
  createCustomRoutes,
  onOrgNavigate,
  resolveOrgLocation
} from './router';

vi.mock('./config', async importOriginal => ({
  ...(await importOriginal()),
  getOrganizationConfigByDomain: vi.fn(() => null)
}));

const SPACE_ROUTE: SpaceRoute = {
  path: 'offchain',
  meta: { orgSpaceId: 's:ens.eth' },
  children: [
    { path: '', name: 'space-proposals' },
    { path: 'create/:key?', name: 'space-editor' },
    { path: ':proposal', name: 'space-proposal' }
  ]
};

const ORG: OrganizationConfig = {
  id: 'ens',
  name: 'ENS',
  spaceIds: [
    { network: 'eth', id: '0x323A' },
    { network: 's', id: 'ens.eth' }
  ],
  routes: [SPACE_ROUTE]
};

const STUB = { template: '' };

const DEFAULT_CHILDREN: RouteRecordRaw[] = [
  {
    path: '',
    name: 'space-proposals',
    component: STUB,
    meta: { title: 'Proposals' }
  },
  {
    path: 'editor',
    name: 'space-editor',
    component: STUB,
    children: [
      { path: 'preview', name: 'space-editor-preview', component: STUB }
    ]
  },
  { path: ':proposal', name: 'space-proposal', component: STUB }
];

function buildRouter(routes: RouteRecordRaw[]) {
  return createRouter({ history: createMemoryHistory(), routes });
}

const BASE_ROUTES: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: STUB },
  {
    path: '/:space',
    name: 'space',
    component: STUB,
    children: DEFAULT_CHILDREN
  },
  { path: '/user', name: 'user', component: STUB },
  { path: '/delegates', name: 'space-delegates', component: STUB },
  {
    path: '/:org',
    name: 'org',
    component: STUB,
    children: [
      { path: '', name: 'org-proposals', component: STUB },
      { path: 'user', name: 'org-user-statement', component: STUB }
    ]
  }
];

describe('organizations/router', () => {
  let router: ReturnType<typeof buildRouter>;

  beforeEach(() => {
    router = buildRouter(BASE_ROUTES);
  });

  afterEach(() => {
    vi.mocked(getOrganizationConfigByDomain).mockReturnValue(null);
  });

  describe('createCustomRoutes', () => {
    it('returns empty array when org has no routes', () => {
      const org: OrganizationConfig = { ...ORG, routes: undefined };

      expect(createCustomRoutes(org, DEFAULT_CHILDREN)).toEqual([]);
    });

    it('creates routes with transformed names and paths', () => {
      const routes = createCustomRoutes(ORG, DEFAULT_CHILDREN);

      expect(routes).toHaveLength(3);
      expect(routes[0]).toMatchObject({
        name: 'space-offchain-proposals',
        path: 'offchain',
        meta: {
          title: 'Proposals',
          orgSpaceId: 's:ens.eth',
          customPath: 'offchain'
        }
      });
      expect(routes[1]).toMatchObject({
        name: 'space-offchain-editor',
        path: 'offchain/create/:key?'
      });
      expect(routes[2]).toMatchObject({
        name: 'space-offchain-proposal',
        path: 'offchain/:proposal'
      });
    });

    it('recursively transforms nested children', () => {
      const routes = createCustomRoutes(ORG, DEFAULT_CHILDREN);
      const editor = routes[1];

      expect(editor.children).toHaveLength(1);
      expect(editor.children![0]).toMatchObject({
        name: 'space-offchain-editor-preview'
      });
    });

    it('skips children that do not match any default route', () => {
      const org: OrganizationConfig = {
        ...ORG,
        routes: [
          {
            path: 'custom',
            meta: { orgSpaceId: 's:ens.eth' },
            children: [{ path: '', name: 'space-nonexistent' }]
          }
        ]
      };

      expect(createCustomRoutes(org, DEFAULT_CHILDREN)).toEqual([]);
    });
  });

  describe('resolveOrgLocation', () => {
    it('passes through string locations', () => {
      expect(resolveOrgLocation('/foo', router)).toBe('/foo');
    });

    it('passes through locations without a name', () => {
      const to = { path: '/foo' };

      expect(resolveOrgLocation(to, router)).toBe(to);
    });

    it('passes through when name is not a string', () => {
      const to = { name: Symbol('test') };

      expect(resolveOrgLocation(to as any, router)).toBe(to);
    });

    describe('whitelabel mode', () => {
      it('resolves custom route when space matches', () => {
        const to = {
          name: 'space-proposals',
          params: { space: 's:ens.eth' }
        };

        const result = resolveOrgLocation(to, router, ORG);

        expect(result).toMatchObject({
          name: 'space-offchain-proposals',
          params: {}
        });
      });

      it('resolves nested child routes by prefix', () => {
        const to = {
          name: 'space-proposal-votes',
          params: { space: 's:ens.eth', proposal: '0x1' }
        };

        const result = resolveOrgLocation(to, router, ORG);

        expect(result).toMatchObject({
          name: 'space-offchain-proposal-votes',
          params: { proposal: '0x1' }
        });
      });

      it('strips space param when route is not a custom route child', () => {
        const to = {
          name: 'space-delegates',
          params: { space: 's:ens.eth' }
        };

        const result = resolveOrgLocation(to, router, ORG);

        expect(result).toMatchObject({
          name: 'space-delegates',
          params: {}
        });
      });

      it('returns original when no transformation applies', () => {
        const to = { name: 'space-proposals', params: { space: 'other' } };

        expect(resolveOrgLocation(to, router, ORG)).toBe(to);
      });
    });

    describe('org mode', () => {
      it('rewrites space-* to org-* routes', async () => {
        await router.push({ name: 'org', params: { org: 'starknet' } });
        const to = { name: 'space-proposals', params: {} };
        const result = resolveOrgLocation(to, router);

        expect(result).toMatchObject({
          name: 'org-proposals',
          params: { org: 'starknet' }
        });
      });

      it('rewrites user route to org-user-statement', async () => {
        await router.push({ name: 'org', params: { org: 'starknet' } });
        const to = { name: 'user', params: {} };
        const result = resolveOrgLocation(to, router);

        expect(result).toMatchObject({
          name: 'org-user-statement',
          params: { org: 'starknet' }
        });
      });

      it('skips when current route is not org', async () => {
        await router.push({ name: 'home' });

        const to = { name: 'space-proposals', params: {} };

        expect(resolveOrgLocation(to, router)).toBe(to);
      });

      it('skips when org config not found', async () => {
        await router.push({ name: 'org', params: { org: 'unknown' } });

        const to = { name: 'space-proposals', params: {} };

        expect(resolveOrgLocation(to, router)).toBe(to);
      });

      it('skips when space param does not belong to org', async () => {
        await router.push({ name: 'org', params: { org: 'ens' } });

        const to = {
          name: 'space-proposals',
          params: { space: 'other:space' }
        };

        expect(resolveOrgLocation(to, router)).toBe(to);
      });

      it('returns original when org route does not exist', async () => {
        const router = buildRouter([
          { path: '/', name: 'home', component: STUB },
          {
            path: '/:org',
            name: 'org',
            component: STUB
          }
        ]);
        await router.push({ name: 'org', params: { org: 'ens' } });

        const to = { name: 'space-proposals', params: {} };

        expect(resolveOrgLocation(to, router)).toBe(to);
      });
    });
  });

  describe('onOrgNavigate', () => {
    it('redirects to custom route on whitelabel domain', () => {
      vi.mocked(getOrganizationConfigByDomain).mockReturnValue(ORG);
      const guard = onOrgNavigate(router);

      const to = {
        name: 'space-proposals',
        params: { space: 's:ens.eth' },
        query: { page: '2' },
        hash: '#votes'
      } as any;

      const result = guard(to, {} as any, () => {});

      expect(result).toMatchObject({
        name: 'space-offchain-proposals',
        params: {},
        query: { page: '2' },
        hash: '#votes'
      });
    });

    it('falls back to resolveOrgLocation when no custom route', async () => {
      await router.push({ name: 'org', params: { org: 'ens' } });
      const guard = onOrgNavigate(router);

      const to = {
        name: 'space-proposals',
        params: {},
        query: {},
        hash: ''
      } as any;

      const result = guard(to, {} as any, () => {});

      expect(result).toMatchObject({
        name: 'org-proposals',
        params: { org: 'ens' }
      });
    });

    it('returns undefined when no redirect needed', async () => {
      await router.push({ name: 'home' });
      const guard = onOrgNavigate(router);

      const to = {
        name: 'home',
        params: {},
        query: {},
        hash: ''
      } as any;

      const result = guard(to, {} as any, () => {});

      expect(result).toBeUndefined();
    });
  });
});
