import { NavItem } from '@/composables/useNav/types';
import { NetworkID, Space, SpaceMetadataTreasury } from '@/types';
import IHAnnotation from '~icons/heroicons-outline/annotation';
import IHCheckCircle from '~icons/heroicons-outline/check-circle';
import IHDocumentText from '~icons/heroicons-outline/document-text';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import IHNewspaper from '~icons/heroicons-outline/newspaper';
import IHWifi from '~icons/heroicons-outline/wifi';

type NavLink = { name?: string; params?: Record<string, string> };

/** Remaps existing default space-* routes under a custom path. Whitelabel only. */
export type SpaceRoute = {
  /** Base path segment, e.g. 'offchain'. No slashes. */
  path: string;
  meta: { orgSpaceId: string };
  /** Each name must reference an existing default route (e.g. 'space-proposals') */
  children: { path: string; name: string }[];
};

export type OrganizationConfig = {
  id: string;
  name: string;
  spaceIds: { network: NetworkID; id: string }[];
  routes?: SpaceRoute[];
  navItems?: Record<string, Partial<NavItem>>;
  /** Org-level treasuries (read-only display). */
  treasuries?: SpaceMetadataTreasury[];
};

export type Organization = OrganizationConfig & {
  spaces: Space[];
};

const DEFAULT_SPACE_ROUTES: SpaceRoute['children'] = [
  { path: '', name: 'space-proposals' },
  { path: 'create/:key?', name: 'space-editor' },
  { path: ':proposal', name: 'space-proposal' }
];

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
      proposals: { name: 'Votes' },
      polls: {
        name: 'Polls',
        icon: IHCheckCircle,
        link: {
          name: 'space-proposals',
          params: { space: 's:starknet.eth' }
        },
        activeRoute: {
          prefix: 'space-proposal',
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
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    spaceIds: [
      {
        network: 'arb1',
        id: '0x789fC99093B09aD01C34DC7251D0C89ce743e5a4'
      },
      {
        network: 'arb1',
        id: '0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9'
      },
      {
        network: 's',
        id: 'arbitrumfoundation.eth'
      }
    ],
    treasuries: [
      {
        name: 'Treasury',
        address: '0xF3FC178157fb3c87548bAA86F9d24BA38E649B58',
        chainId: '42161'
      }
    ],
    routes: [
      {
        path: 'treasury-gov',
        meta: {
          orgSpaceId: 'arb1:0x789fC99093B09aD01C34DC7251D0C89ce743e5a4'
        },
        children: DEFAULT_SPACE_ROUTES
      },
      {
        path: 'core-gov',
        meta: {
          orgSpaceId: 'arb1:0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9'
        },
        children: DEFAULT_SPACE_ROUTES
      },
      {
        path: 'signals',
        meta: { orgSpaceId: 's:arbitrumfoundation.eth' },
        children: DEFAULT_SPACE_ROUTES
      }
    ],
    navItems: {
      proposals: {
        name: 'Treasury governor',
        icon: IHNewspaper,
        link: {
          name: 'space-proposals',
          params: { space: 'arb1:0x789fC99093B09aD01C34DC7251D0C89ce743e5a4' }
        },
        activeRoute: {
          prefix: 'space-treasury-gov'
        }
      },
      core: {
        name: 'Core governor',
        icon: IHNewspaper,
        link: {
          name: 'space-proposals',
          params: { space: 'arb1:0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9' }
        },
        activeRoute: {
          prefix: 'space-core-gov'
        },
        position: 3
      },
      signals: {
        name: 'Offchain voting',
        icon: IHWifi,
        link: {
          name: 'space-proposals',
          params: { space: 's:arbitrumfoundation.eth' }
        },
        activeRoute: {
          prefix: 'space-signals'
        },
        position: 2
      },
      discussions: {
        name: 'Discussions',
        icon: IHAnnotation,
        link: {
          name: 'space-discussions',
          params: { space: 's:arbitrumfoundation.eth' }
        }
      },
      treasury: {
        name: 'Onchain treasury'
      },
      docs: {
        name: 'Docs',
        icon: IHDocumentText,
        link: 'https://docs.arbitrum.foundation/'
      }
    }
  },
  ens: {
    id: 'ens',
    name: 'ENS',
    spaceIds: [
      {
        network: 'eth',
        id: '0x323A76393544d5ecca80cd6ef2A560C6a395b7E3'
      },
      {
        network: 's',
        id: 'ens.eth'
      }
    ],
    routes: [
      {
        path: 'onchain',
        meta: { orgSpaceId: 'eth:0x323A76393544d5ecca80cd6ef2A560C6a395b7E3' },
        children: DEFAULT_SPACE_ROUTES
      },
      {
        path: 'offchain',
        meta: { orgSpaceId: 's:ens.eth' },
        children: DEFAULT_SPACE_ROUTES
      }
    ],
    navItems: {
      proposals: {
        link: {
          name: 'space-proposals',
          params: {
            space: 'eth:0x323A76393544d5ecca80cd6ef2A560C6a395b7E3'
          }
        },
        activeRoute: {
          prefix: 'space-onchain'
        }
      },
      signals: {
        name: 'Signals',
        icon: IHWifi,
        link: {
          name: 'space-proposals',
          params: { space: 's:ens.eth' }
        },
        activeRoute: {
          prefix: 'space-offchain'
        },
        position: 2
      },
      delegates: {
        name: 'Delegates',
        icon: IHLightningBolt,
        link: { name: 'space-delegates', params: { space: 's:ens.eth' } }
      },
      discussions: {
        name: 'Discussions',
        icon: IHAnnotation,
        link: { name: 'space-discussions', params: { space: 's:ens.eth' } }
      }
    }
  }
};

// Override locally with VITE_ORGANIZATION_MAPPING env var for easier testing
// e.g. VITE_ORGANIZATION_MAPPING='localhost;starknet'
const ORGANIZATION_MAPPING = import.meta.env.VITE_ORGANIZATION_MAPPING;

const ORGANIZATION_DOMAINS: Record<string, string> = {
  'starknet.stage.box': 'starknet',
  'governance.starknet.io': 'starknet',
  'vote.ensdao.org': 'ens',
  'ens.stage.box': 'ens',
  'arbitrum.stage.box': 'arbitrum',
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

export function isOrgSpace(
  org: OrganizationConfig,
  spaceParam?: string | string[]
): spaceParam is string {
  if (!spaceParam || Array.isArray(spaceParam)) return false;

  return org.spaceIds.some(s => `${s.network}:${s.id}` === spaceParam);
}

/**
 * Returns the custom route for a space, if one exists.
 */
export function getCustomRoute(
  org: OrganizationConfig,
  spaceId: string
): SpaceRoute | undefined {
  return org.routes?.find(r => r.meta.orgSpaceId === spaceId);
}

export function getOrgProposalLabel(
  organization: Organization | null,
  spaceId: string
): string | undefined {
  const navItems = organization?.navItems;
  if (!navItems) return undefined;

  const match = Object.values(navItems).find(item => {
    if (typeof item.link !== 'object') return false;
    const link = item.link as NavLink;

    return link.name === 'space-proposals' && link.params?.space === spaceId;
  });

  return match?.name ?? navItems.proposals?.name;
}
