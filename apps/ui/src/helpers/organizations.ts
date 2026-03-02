import { RouteLocationNamedRaw, RouteLocationRaw } from 'vue-router';
import { NavItem } from '@/composables/useNav/types';
import { NetworkID, Space } from '@/types';
import IHCheckCircle from '~icons/heroicons-outline/check-circle';
import IHDocumentText from '~icons/heroicons-outline/document-text';

export type NamedRouteLocationRaw = RouteLocationNamedRaw &
  Required<Pick<RouteLocationNamedRaw, 'name'>>;

export type SpaceId = { network: NetworkID; id: string };

export type OrganizationConfig = {
  id: string;
  name: string;
  spaceIds: SpaceId[];
  navItems?: Record<string, NavItem>;
};

export type Organization = OrganizationConfig & {
  spaces: Space[];
};

export const ORGANIZATIONS: Record<string, OrganizationConfig> = {
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
        link: 'https://docs.starknet.io/learn/protocol/strk',
        isExternal: true
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

export const ORGANIZATION_DOMAINS: Record<string, string> = {
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
export function toOrgRoute(
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

/**
 * Rewrites a navigation target to its org route when the space belongs to the organization.
 * Returns the original route unchanged if the space is not part of the organization.
 */
export function resolveOrgRoute(
  organization: Organization,
  to: NamedRouteLocationRaw
): RouteLocationRaw {
  const spaceParam = to.params?.space as string | undefined;
  const isOrgSpace = organization.spaceIds.some(
    s => `${s.network}:${s.id}` === spaceParam
  );
  if (spaceParam && !isOrgSpace) return to;

  const rewritten = toOrgRoute(to.name.toString(), to.params ?? {});
  return rewritten ? { ...to, ...rewritten } : to;
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
