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

export function getOrganizationByDomain(
  domain: string
): OrganizationConfig | null {
  return ORGANIZATIONS[ORGANIZATION_DOMAINS[domain]] ?? null;
}

export function getOrganizationById(id: string): OrganizationConfig | null {
  return ORGANIZATIONS[id] ?? null;
}
