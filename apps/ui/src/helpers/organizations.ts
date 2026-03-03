import {
  RouteLocationNormalized,
  RouteLocationRaw,
  RouteParams,
  Router
} from 'vue-router';
import { NavItem } from '@/composables/useNav/types';
import { stripInvalidSpaceParam } from '@/helpers/router';
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
      polls: {
        name: 'Polls',
        icon: IHCheckCircle,
        link: {
          name: 'space-proposals',
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

function getDefaultSpaceParam(org: OrganizationConfig): string | null {
  const space = org.spaceIds[0];
  return space ? `${space.network}:${space.id}` : null;
}

/**
 * Converts a named location (space-* or user) to its org-* equivalent.
 * Returns null if no matching org route exists.
 */
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

/**
 * Navigation guard that redirects space-* routes to their org equivalents.
 * Delegates to resolveOrgLocation and redirects when the route changes.
 */
export function onOrgNavigate(router: Router) {
  return (to: RouteLocationNormalized) => {
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
 * - /org/:id: rewrites space-* → org-*, injects :org param,
 *   and falls back to the org's first space when :space is missing.
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
    return to;
  }

  if (String(router.currentRoute.value.matched[0]?.name) !== 'org') return to;

  const orgId = router.currentRoute.value.params.org as string;
  const orgConfig = getOrganizationConfigById(orgId);
  if (!orgConfig) return to;

  const toParams: RouteParams = { ...to.params } as RouteParams;

  if (toParams.space) {
    const isInOrg = orgConfig.spaceIds.some(
      s => `${s.network}:${s.id}` === toParams.space
    );
    if (!isInOrg) return to;
  }

  toParams.org = orgId;

  if (!toParams.space) {
    const defaultSpace = getDefaultSpaceParam(orgConfig);
    if (defaultSpace) toParams.space = defaultSpace;
  }

  const rewritten = toOrgLocation(to.name, toParams, router);
  return rewritten ? { ...to, ...rewritten } : to;
}
