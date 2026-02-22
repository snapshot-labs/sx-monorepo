import { SPACES_DISCUSSIONS } from '@/helpers/discourse';
import { NavConfig, NavContext, NavItem, NavProvider } from './types';
import IHAnnotation from '~icons/heroicons-outline/annotation';
import IHGlobeAlt from '~icons/heroicons-outline/globe-alt';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import IHNewspaper from '~icons/heroicons-outline/newspaper';

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

  if (context.organization?.navItems) {
    Object.assign(items, context.organization.navItems);
  }

  const positioned = Object.entries(items)
    .filter(([, item]) => item.position != null)
    .sort(([, a], [, b]) => a.position! - b.position!);
  const result = Object.entries(items).filter(
    ([, item]) => item.position == null
  );

  for (const entry of positioned) {
    const idx = Math.min(entry[1].position! - 1, result.length);
    result.splice(idx, 0, entry);
  }

  return { items: Object.fromEntries(result) };
}

const EXCLUDED_SUB_ROUTES = ['org-editor', 'org-proposal'];

const provider: NavProvider = {
  routeName: 'org',
  isVisible: ({ route }) =>
    !EXCLUDED_SUB_ROUTES.includes(String(route.matched[1]?.name)),
  getConfig: getOrgConfig
};

export default provider;
