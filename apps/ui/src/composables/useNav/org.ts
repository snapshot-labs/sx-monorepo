import { SPACES_DISCUSSIONS } from '@/helpers/discourse';
import { NavConfig, NavContext, NavItem, NavProvider } from './types';
import IHAnnotation from '~icons/heroicons-outline/annotation';
import IHCash from '~icons/heroicons-outline/cash';
import IHGlobeAlt from '~icons/heroicons-outline/globe-alt';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import IHNewspaper from '~icons/heroicons-outline/newspaper';

const EXCLUDED_ROUTE_SUFFIXES = ['editor', 'proposal'];

function getOrgConfig(context: NavContext): NavConfig | null {
  const primarySpace = context.organization?.spaces[0];

  if (!primarySpace) return null;

  const spaceId = `${primarySpace.network}:${primarySpace.id}`;
  const hasDelegates = primarySpace.delegations?.length;
  const hasDiscussions = SPACES_DISCUSSIONS[spaceId];
  const hasTreasury = primarySpace.treasuries?.length;

  // Canonical order matching space.ts
  const allItems: [string, NavItem | null][] = [
    [
      'overview',
      {
        name: 'Overview',
        icon: IHGlobeAlt,
        link: { name: 'space-overview' }
      }
    ],
    [
      'proposals',
      {
        name: 'Proposals',
        icon: IHNewspaper,
        link: { name: 'space-proposals', params: { space: spaceId } },
        activeRoute: {
          prefix: 'space-proposal',
          params: { space: spaceId }
        }
      }
    ],
    [
      'delegates',
      hasDelegates
        ? {
            name: 'Delegates',
            icon: IHLightningBolt,
            link: { name: 'space-delegates', params: { space: spaceId } }
          }
        : null
    ],
    [
      'discussions',
      hasDiscussions
        ? {
            name: 'Discussions',
            icon: IHAnnotation,
            link: { name: 'space-discussions', params: { space: spaceId } }
          }
        : null
    ],
    [
      'treasury',
      hasTreasury
        ? {
            name: 'Treasury',
            icon: IHCash,
            link: { name: 'space-treasury', params: { space: spaceId } }
          }
        : null
    ]
  ];

  const itemsToReposition: [string, NavItem][] = [];

  if (context.organization?.navItems) {
    for (const [key, item] of Object.entries(context.organization.navItems)) {
      const idx = allItems.findIndex(([k]) => k === key);
      if (idx !== -1) {
        const base = allItems[idx][1];
        if (!base && !item.name) continue;
        const merged = { ...(base ?? {}), ...item } as NavItem;
        if (item.position) {
          allItems.splice(idx, 1);
          itemsToReposition.push([key, merged]);
        } else {
          allItems[idx][1] = merged;
        }
      } else {
        itemsToReposition.push([key, item as NavItem]);
      }
    }
  }

  const result = allItems.filter(
    (entry): entry is [string, NavItem] => entry[1] !== null
  );

  itemsToReposition.sort((a, b) => {
    const posA = a[1].position ?? Infinity;
    const posB = b[1].position ?? Infinity;
    return posA - posB;
  });

  for (const [key, item] of itemsToReposition) {
    const idx = item.position
      ? Math.min(item.position - 1, result.length)
      : result.length;
    result.splice(idx, 0, [key, item]);
  }

  return { items: Object.fromEntries(result) };
}

const provider: NavProvider = {
  routeName: 'org',
  isVisible: ({ route, isWhiteLabel, organization }) => {
    const name = String(route.matched[1]?.name);

    if (
      isWhiteLabel &&
      organization?.id === 'starknet' &&
      name.endsWith('-proposal')
    ) {
      return true;
    }
    return !EXCLUDED_ROUTE_SUFFIXES.some(suffix => name.endsWith(`-${suffix}`));
  },
  getConfig: getOrgConfig
};

export default provider;
