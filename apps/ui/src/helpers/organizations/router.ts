import {
  NavigationGuard,
  RouteLocationRaw,
  RouteParams,
  Router,
  RouteRecordRaw
} from 'vue-router';
import { stripInvalidSpaceParam } from '@/helpers/router';
import {
  getCustomRoute,
  getOrganizationConfigByDomain,
  getOrganizationConfigById,
  OrganizationConfig,
  SpaceRoute,
  toOrgSpaceId
} from './config';

type NamedRoute = RouteRecordRaw & { name: string };

function toCustomRouteName(routeName: string, routePath: string): string {
  const [namespace, ...rest] = routeName.split('-');

  return [namespace, routePath, ...rest].join('-');
}

function toCustomRoute(
  route: NamedRoute,
  spaceRoute: SpaceRoute
): RouteRecordRaw {
  return {
    ...route,
    name: toCustomRouteName(route.name, spaceRoute.path),
    meta: { ...route.meta, ...spaceRoute.meta },
    children: route.children?.map(c =>
      toCustomRoute(c as NamedRoute, spaceRoute)
    )
  } as RouteRecordRaw;
}

/**
 * Creates custom routes from an org's route config.
 * Only creates routes for children whose name matches an existing default route.
 */
export function createCustomRoutes(
  org: OrganizationConfig,
  defaultChildren: RouteRecordRaw[]
): RouteRecordRaw[] {
  if (!org.routes) return [];

  return org.routes.flatMap(spaceRoute => {
    return spaceRoute.children.flatMap(child => {
      const source = defaultChildren.find(r => r.name === child.name);
      if (!source) return [];

      return [
        {
          ...toCustomRoute(source as NamedRoute, spaceRoute),
          path: child.path
            ? `${spaceRoute.path}/${child.path}`
            : spaceRoute.path
        }
      ];
    });
  });
}

function resolveCustomRoute(
  org: OrganizationConfig | null,
  routeName: string,
  params: RouteParams,
  spaceParam?: string | string[]
): { name: string; params: RouteParams } | null {
  if (!org || !spaceParam || Array.isArray(spaceParam)) return null;

  const spaceId = toOrgSpaceId(org, spaceParam);
  if (!spaceId) return null;

  const customRoute = getCustomRoute(org, spaceId);
  if (!customRoute) return null;

  const cleanParams = { ...params } as RouteParams;
  delete cleanParams.space;

  return {
    name: toCustomRouteName(routeName, customRoute.path),
    params: cleanParams
  };
}

/** Rewrites a route for whitelabel context: strips invalid :space or resolves to a custom route. */
function toWhiteLabelLocation(
  org: OrganizationConfig,
  name: string,
  params: RouteParams,
  router: Router
): { name: string; params: RouteParams } | null {
  const stripped = stripInvalidSpaceParam(name, params, router);
  if (stripped) return stripped;

  return resolveCustomRoute(org, name, params, params.space);
}

/** Rewrites a route for /org/:org context: space-* → org-*, injects :org param. */
function toOrgLocation(
  name: string,
  params: RouteParams,
  router: Router
): { name: string; params: RouteParams } | null {
  if (String(router.currentRoute.value.matched[0]?.name) !== 'org') return null;

  const orgId = router.currentRoute.value.params.org as string;
  const orgConfig = getOrganizationConfigById(orgId);
  if (!orgConfig) return null;

  if (params.space && !toOrgSpaceId(orgConfig, params.space as string)) {
    return null;
  }

  const toParams = { ...params, org: orgId };

  if (name.startsWith('space-')) {
    const orgRouteName = name.replace('space-', 'org-');
    if (!router.hasRoute(orgRouteName)) return null;

    const stripped = stripInvalidSpaceParam(orgRouteName, toParams, router);

    return stripped ?? { name: orgRouteName, params: toParams };
  }

  if (name === 'user') {
    return { name: 'org-user-statement', params: toParams };
  }

  return null;
}

/**
 * Transforms programmatic navigation (router.push/resolve) for org context.
 * Only applies to default route names — custom routes (e.g. /offchain) are
 * matched directly by Vue Router and don't pass through here.
 *
 * 1. Whitelabel: strip invalid :space or rewrite to custom route
 * 2. /org/:org: rewrite space-* → org-* and inject :org param
 */
export function resolveOrgLocation(
  to: RouteLocationRaw,
  router: Router
): RouteLocationRaw {
  if (typeof to === 'string' || !('name' in to) || typeof to.name !== 'string')
    return to;

  const params = (to.params ?? {}) as RouteParams;
  const whiteLabelOrg = getOrganizationConfigByDomain(window.location.hostname);

  // 1. Whitelabel: strip invalid :space or rewrite to custom route
  if (whiteLabelOrg) {
    const rewritten = toWhiteLabelLocation(
      whiteLabelOrg,
      to.name,
      params,
      router
    );

    return rewritten ? { ...to, ...rewritten } : to;
  }

  // 2. /org/:org: rewrite space-* → org-*
  const rewritten = toOrgLocation(to.name, params, router);

  return rewritten ? { ...to, ...rewritten } : to;
}

/** Navigation guard (beforeEach). Delegates to resolveOrgLocation for programmatic rewrites. */
export function onOrgNavigate(router: Router): NavigationGuard {
  return to => {
    // 1. Whitelabel: redirect to custom route if space has one
    const whiteLabelOrg = getOrganizationConfigByDomain(
      window.location.hostname
    );
    const custom = resolveCustomRoute(
      whiteLabelOrg,
      String(to.name),
      to.params as RouteParams,
      to.params.space
    );

    if (custom) return { ...custom, query: to.query, hash: to.hash };

    // 2. /org/:org: rewrite space-* → org-*
    const raw = { name: String(to.name), params: { ...to.params } };
    const resolved = resolveOrgLocation(raw, router);

    if (
      resolved === raw ||
      typeof resolved === 'string' ||
      !('name' in resolved)
    ) {
      return;
    }

    return {
      name: resolved.name,
      params: resolved.params,
      query: to.query,
      hash: to.hash
    };
  };
}
