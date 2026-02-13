import { NetworkID, Space } from '@/types';

export type OrganizationExternalLink = {
  name: string;
  url: string;
};

export type SpaceRef = { network: NetworkID; id: string };

export type OrganizationConfig = {
  id: string;
  name: string;
  spaceIds: SpaceRef[];
  externalLinks?: OrganizationExternalLink[];
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
    externalLinks: [
      { name: 'Docs', url: 'https://docs.starknet.io/learn/protocol/strk' }
    ]
  },
  snapshot: {
    id: 'snapshot',
    name: 'Snapshot',
    spaceIds: [{ network: 's', id: 'shot.eth' }]
  }
};

export const ORGANIZATION_DOMAINS: Record<string, string> = {
  'governance.starknet.io': 'starknet',
  'starknet.stage.box': 'starknet'
};

const ORG_ROUTES_WITH_SPACE = new Set([
  'org-proposal',
  'org-proposal-overview',
  'org-proposal-votes',
  'org-proposal-execution',
  'org-proposal-discussion',
  'org-editor'
]);

export function toOrgRoute(
  name: string,
  params: Record<string, any> = {}
): { name: string; params: Record<string, any> } | null {
  if (name.startsWith('space-')) {
    const orgRouteName = name.replace('space-', 'org-');
    const newParams = { ...params };
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
