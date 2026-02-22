import { SPACES_DISCUSSIONS } from '@/helpers/discourse';
import { NavConfig, NavContext, NavItem, NavProvider } from './types';
import IHAnnotation from '~icons/heroicons-outline/annotation';
import IHGlobeAlt from '~icons/heroicons-outline/globe-alt';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import IHNewspaper from '~icons/heroicons-outline/newspaper';

function getOrgConfig(context: NavContext): NavConfig {
  const space = context.organization?.spaces[0];

  const items: Record<string, NavItem> = {
    overview: { name: 'Overview', icon: IHGlobeAlt, position: 1 },
    proposals: { name: 'Proposals', icon: IHNewspaper, position: 2 }
  };

  if (space?.delegations?.length) {
    items.delegates = { name: 'Delegates', icon: IHLightningBolt, position: 4 };
  }

  if (space && SPACES_DISCUSSIONS[`${space.network}:${space.id}`]) {
    items.discussions = {
      name: 'Discussions',
      icon: IHAnnotation,
      position: 6,
      active: ['org-discussions', 'org-discussions-topic'].includes(
        context.route.name as string
      )
    };
  }

  if (context.organization?.navItems) {
    Object.assign(items, context.organization.navItems);
  }

  const sorted = Object.entries(items).sort(
    ([, a], [, b]) => (a.position ?? Infinity) - (b.position ?? Infinity)
  );

  return { items: Object.fromEntries(sorted) };
}

const EXCLUDED_SUB_ROUTES = ['org-editor', 'org-proposal'];

const provider: NavProvider = {
  routeName: 'org',
  isVisible: ({ route }) =>
    !EXCLUDED_SUB_ROUTES.includes(String(route.matched[1]?.name)),
  getConfig: getOrgConfig
};

export default provider;
