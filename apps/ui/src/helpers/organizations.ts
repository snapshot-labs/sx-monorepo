import {
  RouteLocationNormalizedLoaded,
  RouteLocationRaw,
  Router
} from 'vue-router';
import { NavItem } from '@/composables/useNav/types';
import { NetworkID, Space } from '@/types';
import IHCheckCircle from '~icons/heroicons-outline/check-circle';
import IHDocumentText from '~icons/heroicons-outline/document-text';

type SpaceId = { network: NetworkID; id: string };

export type OrganizationConfig = {
  id: string;
  name: string;
  spaceIds: SpaceId[];
  navItems?: Record<string, NavItem>;
};

export type Organization = OrganizationConfig & {
  spaces: Space[];
};

const ORGANIZATIONS: Record<string, OrganizationConfig> = {
  starknet: {
    id: 'starknet',
    name: 'Starknet',
    spaceIds: [
      {
        network: 'sn',
        id: '0x009fedaf0d7a480d21a27683b0965c0f8ded35b3f1cac39827a25a06a8a682a4'
      },
      {
        network: 's',
        id: 'starknet.eth'
      }
    ],
    navItems: {
      'space-proposals': {
        name: 'Polls',
        icon: IHCheckCircle,
        link: {
          name: 'org-space-proposals',
          params: { space: 's:starknet.eth' }
        },
        position: 3
      },
      docs: {
        name: 'Docs',
        icon: IHDocumentText,
        link: 'https://docs.starknet.io/learn/protocol/strk'
      }
    }
  },
  snapshot: {
    id: 'snapshot',
    name: 'Snapshot',
    spaceIds: [{ network: 's', id: 'shot.eth' }]
  }
};

// Override locally with VITE_ORGANIZATION_MAPPING env var for easier testing
// e.g. VITE_ORGANIZATION_MAPPING='localhost;starknet'
const ORGANIZATION_MAPPING = import.meta.env.VITE_ORGANIZATION_MAPPING;

const ORGANIZATION_DOMAINS: Record<string, string> = {
  'starknet.stage.box': 'starknet',
  ...(ORGANIZATION_MAPPING
    ? {
        [ORGANIZATION_MAPPING.split(';')[0]]: ORGANIZATION_MAPPING.split(';')[1]
      }
    : {})
};

const ORG_ROUTES_WITH_SPACE = new Set([
  'org-proposal',
  'org-proposal-overview',
  'org-proposal-votes',
  'org-proposal-execution',
  'org-proposal-discussion',
  'org-editor',
  'org-space-proposals'
]);

/**
 * Converts a space route (e.g. 'space-proposals') to its org equivalent (e.g. 'org-proposals').
 * Returns null if the route has no org equivalent.
 */
function toOrgRoute(
  name: string,
  params: Record<string, any> = {}
): { name: string; params: Record<string, any> } | null {
  if (name.startsWith('space-')) {
    const suffix = name.slice('space-'.length);
    const orgRouteName = `org-${suffix}`;
    const orgSpaceRouteName = `org-space-${suffix}`;
    const newParams = { ...params };

    if (newParams.space && ORG_ROUTES_WITH_SPACE.has(orgSpaceRouteName)) {
      return { name: orgSpaceRouteName, params: newParams };
    }

    if (!ORG_ROUTES_WITH_SPACE.has(orgRouteName)) delete newParams.space;
    return { name: orgRouteName, params: newParams };
  }

  if (name === 'user') {
    return { name: 'org-user-statement', params };
  }

  return null;
}

export function getOrganizationConfigByDomain(
  domain: string
): OrganizationConfig | null {
  return ORGANIZATIONS[ORGANIZATION_DOMAINS[domain]] ?? null;
}

export function getOrganizationConfigById(
  id: string
): OrganizationConfig | null {
  return ORGANIZATIONS[id] ?? null;
}

/**
 * Patches router.push, router.replace, and router.resolve to rewrite
 * space-* route names to org-* equivalents when in an org context.
 *
 * In whitelabel mode, space-* named routes don't exist in the route table,
 * so router.push/resolve throw before guards can intercept.
 * In non-whitelabel mode (/org/:org), space-* routes exist but would
 * navigate outside the org context without rewriting.
 *
 * Skips rewriting when the target space is not part of the current org.
 */
export function patchRouterForOrg(router: Router) {
  const originalPush = router.push.bind(router);
  const originalReplace = router.replace.bind(router);
  const originalResolve = router.resolve.bind(router);

  const isOrgWhiteLabel = !!getOrganizationConfigByDomain(
    window.location.hostname
  );

  function rewriteLocation(to: RouteLocationRaw): RouteLocationRaw {
    if (
      typeof to === 'string' ||
      !('name' in to) ||
      typeof to.name !== 'string'
    )
      return to;

    if (
      !isOrgWhiteLabel &&
      String(router.currentRoute.value.matched[0]?.name) !== 'org'
    )
      return to;

    const spaceParam = to.params?.space as string | undefined;
    if (spaceParam) {
      const orgId = router.currentRoute.value.params.org as string | undefined;
      const org =
        getOrganizationConfigByDomain(window.location.hostname) ??
        (orgId ? getOrganizationConfigById(orgId) : null);
      const isOrgSpace = org?.spaceIds.some(
        s => `${s.network}:${s.id}` === spaceParam
      );
      if (!isOrgSpace) return to;
    }

    const rewritten = toOrgRoute(to.name, {
      ...(to.params as Record<string, string>)
    });
    return rewritten ? { ...to, ...rewritten } : to;
  }

  router.push = to => originalPush(rewriteLocation(to));
  router.replace = to => originalReplace(rewriteLocation(to));
  router.resolve = (
    to: RouteLocationRaw,
    currentLocation?: RouteLocationNormalizedLoaded
  ) => originalResolve(rewriteLocation(to), currentLocation);
}
