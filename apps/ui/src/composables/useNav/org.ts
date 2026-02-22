import { SPACES_DISCUSSIONS } from '@/helpers/discourse';
import { NavConfig, NavContext, NavItem, NavProvider } from './types';
import IHAnnotation from '~icons/heroicons-outline/annotation';
import IHGlobeAlt from '~icons/heroicons-outline/globe-alt';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import IHNewspaper from '~icons/heroicons-outline/newspaper';

const EXCLUDED_SUB_ROUTES = ['org-editor', 'org-proposal'];

function getOrgConfig(context: NavContext): NavConfig {
  const space = context.organization?.spaces[0];

  const items: Record<string, NavItem> = {
    overview: { name: 'Overview', icon: IHGlobeAlt },
    proposals: { name: 'Proposals', icon: IHNewspaper }
  };

  if (space?.delegations?.length) {
    items.delegates = { name: 'Delegates', icon: IHLightningBolt };
  }

  if (space && SPACES_DISCUSSIONS[`${space.network}:${space.id}`]) {
    items.discussions = {
      name: 'Discussions',
      icon: IHAnnotation,
      active: ['org-discussions', 'org-discussions-topic'].includes(
        context.route.name as string
      )
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
  isVisible: ({ route }) =>
    !EXCLUDED_SUB_ROUTES.includes(String(route.matched[1]?.name)),
  getConfig: getOrgConfig
};

export default provider;
