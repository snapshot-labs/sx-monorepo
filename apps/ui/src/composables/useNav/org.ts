import { SPACES_DISCUSSIONS } from '@/helpers/discourse';
import { NavConfig, NavContext, NavItem, NavProvider } from './types';
import IHAnnotation from '~icons/heroicons-outline/annotation';
import IHGlobeAlt from '~icons/heroicons-outline/globe-alt';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import IHNewspaper from '~icons/heroicons-outline/newspaper';

const EXCLUDED_ROUTE_SUFFIXES = ['editor', 'proposal'];

function getOrgConfig(context: NavContext): NavConfig | null {
  const primarySpace = context.organization?.spaces[0];

  if (!primarySpace) return null;

  const items: Record<string, NavItem> = {
    overview: {
      name: 'Overview',
      icon: IHGlobeAlt,
      link: { name: 'space-overview' }
    },
    proposals: {
      name: 'Proposals',
      icon: IHNewspaper,
      link: {
        name: 'space-proposals',
        params: { space: `${primarySpace.network}:${primarySpace.id}` }
      }
    }
  };

  if (primarySpace.delegations?.length) {
    items.delegates = {
      name: 'Delegates',
      icon: IHLightningBolt,
      link: { name: 'space-delegates' }
    };
  }

  if (SPACES_DISCUSSIONS[`${primarySpace.network}:${primarySpace.id}`]) {
    items.discussions = {
      name: 'Discussions',
      icon: IHAnnotation,
      link: { name: 'space-discussions' },
      isActiveOnChildren: true
    };
  }

  const result = Object.entries(items);

  if (context.organization?.navItems) {
    for (const [key, item] of Object.entries(context.organization.navItems)) {
      const idx = item.position
        ? Math.min(item.position - 1, result.length)
        : result.length;
      result.splice(idx, 0, [key, item]);
    }
  }

  return { items: Object.fromEntries(result) };
}

const provider: NavProvider = {
  routeName: 'org',
  isVisible: ({ route }) => {
    const name = String(route.matched[1]?.name);
    return !EXCLUDED_ROUTE_SUFFIXES.some(suffix => name.endsWith(`-${suffix}`));
  },
  getConfig: getOrgConfig
};

export default provider;
