import { SPACES_DISCUSSIONS } from '@/helpers/discourse';
import { compareAddresses } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';
import { NavigationConfig, NavigationItem, NavParams } from '.';
import IHAnnotation from '~icons/heroicons-outline/annotation';
import IHArrowLongLeft from '~icons/heroicons-outline/arrow-long-left';
import IHCash from '~icons/heroicons-outline/cash';
import IHCog from '~icons/heroicons-outline/cog';
import IHGlobeAlt from '~icons/heroicons-outline/globe-alt';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import IHNewspaper from '~icons/heroicons-outline/newspaper';
import IHUserGroup from '~icons/heroicons-outline/user-group';

function getSettingsRoute(
  params: NavParams,
  tab: string,
  { name, hidden }: { name: string; hidden?: boolean }
): NavigationItem {
  return {
    name,
    link: { name: 'space-settings', params: { tab } },
    active: params.route.params.tab === tab,
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

function getSpaceSettingsConfig(params: NavParams): NavigationConfig {
  const isOffchainNetwork = params.space
    ? offchainNetworks.includes(params.space.network)
    : false;

  const tabItems = Object.fromEntries(
    SETTINGS_TABS.map(({ key, tab, name, offchainOnly, onchainOnly }) => [
      key,
      getSettingsRoute(params, tab ?? key, {
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

export function canSeeSettings(params: NavParams): boolean {
  const isOwner =
    params.ensOwner && compareAddresses(params.ensOwner, params.account);
  if (params.isController || isOwner) return true;

  if (params.space?.additionalRawData?.type === 'offchain') {
    const admins = params.space.additionalRawData.admins.map((admin: string) =>
      admin.toLowerCase()
    );

    return admins.includes(params.account.toLowerCase());
  }

  return false;
}

function getSpaceMainConfig(params: NavParams): NavigationConfig {
  const items: Record<string, NavigationItem> = {
    overview: { name: 'Overview', icon: IHGlobeAlt },
    proposals: { name: 'Proposals', icon: IHNewspaper },
    leaderboard: { name: 'Leaderboard', icon: IHUserGroup }
  };

  if (params.space?.delegations && params.space.delegations.length > 0) {
    items.delegates = { name: 'Delegates', icon: IHLightningBolt };
  }

  if (SPACES_DISCUSSIONS[`${params.networkId}:${params.address}`]) {
    items.discussions = {
      name: 'Discussions',
      icon: IHAnnotation,
      active: ['space-discussions', 'space-discussions-topic'].includes(
        params.route.name as string
      )
    };
  }

  if (params.space?.treasuries?.length) {
    items.treasury = { name: 'Treasury', icon: IHCash };
  }

  if (canSeeSettings(params)) {
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
  getConfig(params: NavParams): NavigationConfig {
    if (params.route.name === 'space-settings') {
      return getSpaceSettingsConfig(params);
    }
    return getSpaceMainConfig(params);
  }
};
