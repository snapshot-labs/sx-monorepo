import { SPACES_DISCUSSIONS } from '@/helpers/discourse';
import { compareAddresses } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';
import { NavContext, NavigationConfig, NavigationItem } from './types';
import IHAnnotation from '~icons/heroicons-outline/annotation';
import IHArrowLongLeft from '~icons/heroicons-outline/arrow-long-left';
import IHCash from '~icons/heroicons-outline/cash';
import IHCog from '~icons/heroicons-outline/cog';
import IHGlobeAlt from '~icons/heroicons-outline/globe-alt';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import IHNewspaper from '~icons/heroicons-outline/newspaper';
import IHUserGroup from '~icons/heroicons-outline/user-group';

function getSettingsRoute(
  context: NavContext,
  tab: string,
  { name, hidden }: { name: string; hidden?: boolean }
): NavigationItem {
  return {
    name,
    link: { name: 'space-settings', params: { tab } },
    active: context.route.params.tab === tab,
    hidden
  };
}

const SETTINGS_TABS: {
  key: string;
  tab?: string;
  name: string;
  offchainOnly?: boolean;
  onchainOnly?: boolean;
}[] = [
  { key: 'profile', name: 'Profile' },
  { key: 'proposal', name: 'Proposal' },
  {
    key: 'votingStrategies',
    tab: 'voting-strategies',
    name: 'Voting strategies'
  },
  { key: 'voting', name: 'Voting' },
  { key: 'members', name: 'Members', offchainOnly: true },
  { key: 'execution', name: 'Execution', onchainOnly: true },
  { key: 'authenticators', name: 'Authenticators', onchainOnly: true },
  { key: 'treasuries', name: 'Treasuries' },
  { key: 'delegations', name: 'Delegations' },
  { key: 'labels', name: 'Labels' },
  { key: 'whitelabel', name: 'Custom domain', offchainOnly: true },
  { key: 'advanced', name: 'Advanced', offchainOnly: true },
  { key: 'controller', name: 'Controller' },
  { key: 'billing', name: 'Billing', offchainOnly: true }
];

function getSpaceSettingsConfig(context: NavContext): NavigationConfig {
  const isOffchainNetwork = context.space
    ? offchainNetworks.includes(context.space.network)
    : false;

  const tabItems = Object.fromEntries(
    SETTINGS_TABS.map(({ key, tab, name, offchainOnly, onchainOnly }) => [
      key,
      getSettingsRoute(context, tab ?? key, {
        name,
        hidden:
          (offchainOnly && !isOffchainNetwork) ||
          (onchainOnly && isOffchainNetwork)
      })
    ])
  );

  return {
    style: 'slim',
    items: {
      back: {
        name: 'Settings',
        icon: IHArrowLongLeft,
        link: { name: 'space-overview' },
        active: true
      },
      ...tabItems
    }
  };
}

export function canSeeSettings(context: NavContext): boolean {
  const isOwner =
    context.ensOwner && compareAddresses(context.ensOwner, context.account);
  if (context.isController || isOwner) return true;

  if (context.space?.additionalRawData?.type === 'offchain') {
    const admins = context.space.additionalRawData.admins.map(admin =>
      admin.toLowerCase()
    );

    return admins.includes(context.account.toLowerCase());
  }

  return false;
}

function getSpaceMainConfig(context: NavContext): NavigationConfig {
  const items: Record<string, NavigationItem> = {
    overview: { name: 'Overview', icon: IHGlobeAlt },
    proposals: { name: 'Proposals', icon: IHNewspaper },
    leaderboard: { name: 'Leaderboard', icon: IHUserGroup }
  };

  if (context.space?.delegations && context.space.delegations.length > 0) {
    items.delegates = { name: 'Delegates', icon: IHLightningBolt };
  }

  if (SPACES_DISCUSSIONS[`${context.networkId}:${context.address}`]) {
    items.discussions = {
      name: 'Discussions',
      icon: IHAnnotation,
      active: ['space-discussions', 'space-discussions-topic'].includes(
        context.route.name as string
      )
    };
  }

  if (context.space?.treasuries?.length) {
    items.treasury = { name: 'Treasury', icon: IHCash };
  }

  if (canSeeSettings(context)) {
    items.settings = {
      name: 'Settings',
      icon: IHCog,
      link: { name: 'space-settings', params: { tab: 'profile' } }
    };
  }

  return { items };
}

export default {
  routeName: 'space',
  getConfig(context: NavContext): NavigationConfig {
    if (context.route.name === 'space-settings') {
      return getSpaceSettingsConfig(context);
    }
    return getSpaceMainConfig(context);
  }
};
