import { RouteLocationNamedRaw, RouteLocationRaw } from 'vue-router';
import { NavItem } from '@/composables/useNav/types';
import { NetworkID, Space } from '@/types';
import IHDocumentText from '~icons/heroicons-outline/document-text';
import IHNewspaper from '~icons/heroicons-outline/newspaper';

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
        icon: IHNewspaper,
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

export const ORGANIZATION_DOMAINS: Record<string, string> = {
  'starknet.stage.box': 'starknet'
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
