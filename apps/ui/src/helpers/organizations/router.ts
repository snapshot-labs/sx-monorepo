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
  toOrgSpaceId
} from './config';

type NamedRoute = RouteRecordRaw & { name: string };

function withMeta(
  route: NamedRoute,
  meta: Record<string, unknown>,
  routePath: string
): RouteRecordRaw {
  return {
    ...route,
    name: String(route.name).replace(/^([^-]+-)/, `$1${routePath}-`),
    meta: { ...route.meta, ...meta },
    children: route.children?.map(c =>
      withMeta(c as NamedRoute, meta, routePath)
    )
  } as RouteRecordRaw;
}

function toOrgLocation(
  name: string,
  params: RouteParams,
  router: Router
): { name: string; params: RouteParams } | null {
  if (name.startsWith('space-')) {
    const orgRouteName = name.replace('space-', 'org-');
    if (!router.hasRoute(orgRouteName)) return null;

    const stripped = stripInvalidSpaceParam(orgRouteName, params, router);

    return stripped ?? { name: orgRouteName, params };
  }

  if (name === 'user') {
    return { name: 'org-user-statement', params };
  }

  return null;
}

function toCustomRouteName(routeName: string, routePath: string): string {
  const [namespace, ...rest] = routeName.split('-');

  return [namespace, routePath, ...rest].join('-');
}

/**
 * Resolves the custom route name for a space, if one exists and is registered.
 */
function resolveCustomRouteName(
  org: OrganizationConfig | null,
  routeName: string,
  spaceParam?: string | string[]
): string | null {
  if (!org || !spaceParam || Array.isArray(spaceParam)) return null;

  const spaceId = toOrgSpaceId(org, spaceParam);
  if (!spaceId) return null;

  const customRoute = getCustomRoute(org, spaceId);
  if (!customRoute) return null;

  return toCustomRouteName(routeName, customRoute.path);
}

/**
 * Creates custom routes from an org's route config.
 * Looks up components from the default children by matching route names.
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

      const route = {
        path: child.path ? `${spaceRoute.path}/${child.path}` : spaceRoute.path,
        name: toCustomRouteName(child.name, spaceRoute.path),
        component: source.component,
        meta: spaceRoute.meta,
        children: source.children?.map(c =>
          withMeta(c as NamedRoute, spaceRoute.meta, spaceRoute.path)
        )
      } as RouteRecordRaw;

      return [route];
    });
  });
}

/**
 * Navigation guard that redirects space-* routes to their org equivalents.
 * Also redirects default space routes to custom routes when applicable.
 */
export function onOrgNavigate(router: Router): NavigationGuard {
  return to => {
    // Redirect default routes to custom routes for whitelabel orgs
    const whiteLabelOrg = getOrganizationConfigByDomain(
      window.location.hostname
    );
    const customName = resolveCustomRouteName(
      whiteLabelOrg,
      String(to.name),
      to.params.space
    );

    if (customName) {
      const params = { ...to.params };
      delete params.space;

      return {
        name: customName,
        params,
        query: to.query,
        hash: to.hash
      };
    }

    const raw = {
      name: String(to.name),
      params: { ...to.params }
    };
    const resolved = resolveOrgLocation(raw, router);
    if (
      resolved === raw ||
      typeof resolved === 'string' ||
      !('name' in resolved)
    )
      return;

    return {
      name: resolved.name,
      params: resolved.params,
      query: to.query,
      hash: to.hash
    };
  };
}

/**
 * Resolves a route location for org context:
 * - Whitelabel: strips :space param from routes that don't have :space in their path.
 * - /org/:id: rewrites space-* → org-* and injects :org param.
 * Returns `to` unchanged when no transformation is needed.
 */
export function resolveOrgLocation(
  to: RouteLocationRaw,
  router: Router
): RouteLocationRaw {
  if (typeof to === 'string' || !('name' in to) || typeof to.name !== 'string')
    return to;

  const whiteLabelOrg = getOrganizationConfigByDomain(window.location.hostname);

  if (whiteLabelOrg) {
    const stripped = stripInvalidSpaceParam(to.name, to.params ?? {}, router);
    if (stripped) return { ...to, ...stripped };

    // Rewrite to custom route when target space has one
    const customName = resolveCustomRouteName(
      whiteLabelOrg,
      to.name,
      to.params?.space as string | undefined
    );

    if (customName) {
      const params = { ...(to.params ?? {}) } as Record<string, string>;
      delete params.space;

      return { ...to, name: customName, params };
    }

    return to;
  }

  if (String(router.currentRoute.value.matched[0]?.name) !== 'org') return to;

  const orgId = router.currentRoute.value.params.org as string;
  const orgConfig = getOrganizationConfigById(orgId);
  if (!orgConfig) return to;

  const toParams: RouteParams = { ...to.params } as RouteParams;

  if (toParams.space) {
    if (!toOrgSpaceId(orgConfig, toParams.space as string)) return to;
  }

  toParams.org = orgId;

  const rewritten = toOrgLocation(to.name, toParams, router);

  return rewritten ? { ...to, ...rewritten } : to;
}
