import { NetworkID, SkinSettings } from '@/types';

export type OrganizationSpace = {
  network: NetworkID;
  id: string;
};

export type OrganizationExternalLink = {
  name: string;
  url: string;
};

export type OrganizationDefinition = {
  id: string;
  name: string;
  primarySpace: OrganizationSpace;
  secondarySpace: OrganizationSpace;
  skinSettings?: Partial<SkinSettings>;
  externalLinks: OrganizationExternalLink[];
};

export const ORGANIZATIONS: Record<string, OrganizationDefinition> = {
  starknet: {
    id: 'starknet',
    name: 'Starknet',
    primarySpace: {
      network: 'sn',
      id: '0x009fedaf0d7a480d21a27683b0965c0f8ded35b3f1cac39827a25a06a8a682a4'
    },
    secondarySpace: {
      network: 's',
      id: 'starknet.eth'
    },
    skinSettings: {
      bg_color: '#f9f8f9',
      link_color: '#000000',
      text_color: '#4a4a4f',
      border_color: '#e3e1e4',
      heading_color: '#1a1523',
      theme: 'light',
      logo: 'ipfs://bafkreibsvohq3zg4zv5rxjv3vs57jmazs6lgrunjqy5n5uahdktconwple'
    },
    externalLinks: [
      { name: 'Docs', url: 'https://docs.starknet.io/learn/protocol/strk' }
    ]
  }
};

export const ORGANIZATION_DOMAINS: Record<string, string> = {
  'governance.starknet.io': 'starknet',
  'starknet.stage.box': 'starknet'
};

export function getOrganizationByDomain(
  domain: string
): OrganizationDefinition | null {
  const orgId = ORGANIZATION_DOMAINS[domain];
  return orgId ? ORGANIZATIONS[orgId] ?? null : null;
}

export function getOrganizationById(id: string): OrganizationDefinition | null {
  return ORGANIZATIONS[id] ?? null;
}
