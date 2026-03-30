// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RouteParams, RouteRecordRaw } from 'vue-router';
import {
  getCustomRoute,
  getOrganizationConfigByDomain,
  getOrganizationConfigById,
  isOrgSpace,
  OrganizationConfig,
  SpaceRoute
} from './config';
import {
  createCustomRoutes,
  onOrgNavigate,
  resolveOrgLocation
} from './router';

vi.mock('./config', () => ({
  getOrganizationConfigByDomain: vi.fn(() => null),
  getOrganizationConfigById: vi.fn(() => null),
  isOrgSpace: vi.fn(() => false),
  getCustomRoute: vi.fn(() => undefined)
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

const DEFAULT_CHILDREN: RouteRecordRaw[] = [
  {
    path: '',
    name: 'space-proposals',
    component: { template: '' },
    meta: { title: 'Proposals' }
  },
  {
    path: 'editor',
    name: 'space-editor',
    component: { template: '' },
    children: [
      {
        path: 'preview',
        name: 'space-editor-preview',
        component: { template: '' }
      }
    ]
  },
  {
    path: ':proposal',
    name: 'space-proposal',
    component: { template: '' }
  }
];

function createMockRouter({
  currentRouteName = 'org',
  currentParams = {} as RouteParams,
  routes = [] as { name?: string; path: string }[],
  hasRouteOverride
}: {
  currentRouteName?: string;
  currentParams?: RouteParams;
  routes?: { name?: string; path: string }[];
  hasRouteOverride?: (name: string) => boolean;
} = {}) {
  return {
    currentRoute: {
      value: {
        matched: [{ name: currentRouteName }],
        params: currentParams
      }
    },
    hasRoute:
      hasRouteOverride ?? ((name: string) => routes.some(r => r.name === name)),
    getRoutes: () => routes
  } as any;
}

describe('organizations/router', () => {
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
    afterEach(() => {
      vi.mocked(getOrganizationConfigByDomain).mockReturnValue(null);
      vi.mocked(getOrganizationConfigById).mockReturnValue(null);
      vi.mocked(isOrgSpace).mockReturnValue(false);
      vi.mocked(getCustomRoute).mockReturnValue(undefined);
    });

    it('passes through string locations', () => {
      const router = createMockRouter();

      expect(resolveOrgLocation('/foo', router)).toBe('/foo');
    });

    it('passes through locations without a name', () => {
      const router = createMockRouter();
      const to = { path: '/foo' };

      expect(resolveOrgLocation(to, router)).toBe(to);
    });

    it('passes through when name is not a string', () => {
      const router = createMockRouter();
      const to = { name: Symbol('test') };

      expect(resolveOrgLocation(to as any, router)).toBe(to);
    });

    describe('whitelabel mode', () => {
      it('resolves custom route when space matches', () => {
        vi.mocked(isOrgSpace).mockReturnValue(true);
        vi.mocked(getCustomRoute).mockReturnValue(SPACE_ROUTE);

        const router = createMockRouter();
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
        vi.mocked(isOrgSpace).mockReturnValue(true);
        vi.mocked(getCustomRoute).mockReturnValue(SPACE_ROUTE);

        const router = createMockRouter();
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
        vi.mocked(isOrgSpace).mockReturnValue(true);
        vi.mocked(getCustomRoute).mockReturnValue(SPACE_ROUTE);

        const router = createMockRouter({
          routes: [{ name: 'space-delegates', path: '/delegates' }]
        });
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
        vi.mocked(isOrgSpace).mockReturnValue(false);

        const router = createMockRouter({
          routes: [{ name: 'space-proposals', path: '/:space/proposals' }]
        });
        const to = { name: 'space-proposals', params: { space: 'other' } };

        expect(resolveOrgLocation(to, router, ORG)).toBe(to);
      });
    });

    describe('org mode', () => {
      it('rewrites space-* to org-* routes', () => {
        const router = createMockRouter({
          currentRouteName: 'org',
          currentParams: { org: 'starknet' },
          routes: [{ name: 'org-proposals', path: '/:org/proposals' }],
          hasRouteOverride: () => true
        });
        vi.mocked(getOrganizationConfigById).mockReturnValue(ORG);

        const to = { name: 'space-proposals', params: {} };
        const result = resolveOrgLocation(to, router);

        expect(result).toMatchObject({
          name: 'org-proposals',
          params: { org: 'starknet' }
        });
      });

      it('rewrites user route to org-user-statement', () => {
        const router = createMockRouter({
          currentRouteName: 'org',
          currentParams: { org: 'starknet' }
        });
        vi.mocked(getOrganizationConfigById).mockReturnValue(ORG);

        const to = { name: 'user', params: {} };
        const result = resolveOrgLocation(to, router);

        expect(result).toMatchObject({
          name: 'org-user-statement',
          params: { org: 'starknet' }
        });
      });

      it('skips when current route is not org', () => {
        const router = createMockRouter({ currentRouteName: 'space' });

        const to = { name: 'space-proposals', params: {} };

        expect(resolveOrgLocation(to, router)).toBe(to);
      });

      it('skips when org config not found', () => {
        const router = createMockRouter({
          currentRouteName: 'org',
          currentParams: { org: 'unknown' }
        });
        vi.mocked(getOrganizationConfigById).mockReturnValue(null);

        const to = { name: 'space-proposals', params: {} };

        expect(resolveOrgLocation(to, router)).toBe(to);
      });

      it('skips when space param does not belong to org', () => {
        const router = createMockRouter({
          currentRouteName: 'org',
          currentParams: { org: 'ens' }
        });
        vi.mocked(getOrganizationConfigById).mockReturnValue(ORG);
        vi.mocked(isOrgSpace).mockReturnValue(false);

        const to = {
          name: 'space-proposals',
          params: { space: 'other:space' }
        };

        expect(resolveOrgLocation(to, router)).toBe(to);
      });

      it('returns null when org route does not exist', () => {
        const router = createMockRouter({
          currentRouteName: 'org',
          currentParams: { org: 'ens' },
          hasRouteOverride: () => false
        });
        vi.mocked(getOrganizationConfigById).mockReturnValue(ORG);

        const to = { name: 'space-proposals', params: {} };

        expect(resolveOrgLocation(to, router)).toBe(to);
      });
    });
  });

  describe('onOrgNavigate', () => {
    afterEach(() => {
      vi.mocked(getOrganizationConfigByDomain).mockReturnValue(null);
      vi.mocked(isOrgSpace).mockReturnValue(false);
      vi.mocked(getCustomRoute).mockReturnValue(undefined);
    });

    it('redirects to custom route on whitelabel domain', () => {
      vi.mocked(getOrganizationConfigByDomain).mockReturnValue(ORG);
      vi.mocked(isOrgSpace).mockReturnValue(true);
      vi.mocked(getCustomRoute).mockReturnValue(SPACE_ROUTE);

      const router = createMockRouter();
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

    it('falls back to resolveOrgLocation when no custom route', () => {
      vi.mocked(getOrganizationConfigByDomain).mockReturnValue(null);
      vi.mocked(getOrganizationConfigById).mockReturnValue(ORG);

      const router = createMockRouter({
        currentRouteName: 'org',
        currentParams: { org: 'ens' },
        hasRouteOverride: () => true
      });
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

    it('returns undefined when no redirect needed', () => {
      const router = createMockRouter({ currentRouteName: 'home' });
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
