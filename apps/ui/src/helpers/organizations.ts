import {
  RouteLocationNormalized,
  RouteLocationRaw,
  RouteParams,
  Router
} from 'vue-router';
import { NavItem } from '@/composables/useNav/types';
import { stripInvalidSpaceParam } from '@/helpers/router';
import { NetworkID, Space } from '@/types';
import IHAnnotation from '~icons/heroicons-outline/annotation';
import IHCheckCircle from '~icons/heroicons-outline/check-circle';
import IHDocumentText from '~icons/heroicons-outline/document-text';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import IHWifi from '~icons/heroicons-outline/wifi';

type SpaceId = { network: NetworkID; id: string; alias?: string };

export type OrganizationConfig = {
  id: string;
  name: string;
  spaceIds: SpaceId[];
  navItems?: Record<string, Partial<NavItem>>;
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
  ens: {
    id: 'ens',
    name: 'ENS',
    spaceIds: [
      {
        network: 'eth',
        id: '0x323A76393544d5ecca80cd6ef2A560C6a395b7E3',
        alias: 'onchain'
      },
      {
        network: 's',
        id: 'ens.eth',
        alias: 'offchain'
      }
    ],
    navItems: {
      proposals: {
        link: {
          name: 'space-proposals',
          params: { space: 'onchain' }
        },
        activeRoute: {
          prefix: 'space-proposal',
          params: { space: 'onchain' }
        }
      },
      signals: {
        name: 'Signals',
        icon: IHWifi,
        link: {
          name: 'space-proposals',
          params: { space: 'offchain' }
        },
        activeRoute: {
          prefix: 'space-proposals',
          params: { space: 'offchain' }
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
  'ens.stage.box': 'ens',
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

/**
 * Resolves a space param (alias or canonical) to its canonical `network:id`.
 * Returns null if the space doesn't belong to the organization.
 */
export function toOrgSpaceId(
  org: OrganizationConfig,
  param: string
): string | null {
  const match = org.spaceIds.find(
    s => s.alias === param || `${s.network}:${s.id}` === param
  );
  return match ? `${match.network}:${match.id}` : null;
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

  const currentSpace = router.currentRoute.value.params.space as
    | string
    | undefined;

  if (whiteLabelOrg) {
    const stripped = stripInvalidSpaceParam(to.name, to.params ?? {}, router);
    if (stripped) return { ...to, ...stripped };

    if (currentSpace && to.params?.space) {
      const currentId = toOrgSpaceId(whiteLabelOrg, currentSpace);
      const targetId = toOrgSpaceId(whiteLabelOrg, to.params.space as string);
      if (currentId && targetId && currentId === targetId) {
        return { ...to, params: { ...to.params, space: currentSpace } };
      }
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
    if (currentSpace) {
      const currentId = toOrgSpaceId(orgConfig, currentSpace);
      const targetId = toOrgSpaceId(orgConfig, toParams.space as string);
      if (currentId && targetId && currentId === targetId) {
        toParams.space = currentSpace;
      }
    }
  }

  toParams.org = orgId;

  const rewritten = toOrgLocation(to.name, toParams, router);
  return rewritten ? { ...to, ...rewritten } : to;
}
