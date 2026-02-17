import { SPACES_DISCUSSIONS } from '@/helpers/discourse';
import { compareAddresses } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';
import { NavContext, NavigationConfig, NavigationItem } from '.';
import IHAnnotation from '~icons/heroicons-outline/annotation';
import IHArrowLongLeft from '~icons/heroicons-outline/arrow-long-left';
import IHCash from '~icons/heroicons-outline/cash';
import IHCog from '~icons/heroicons-outline/cog';
import IHGlobeAlt from '~icons/heroicons-outline/globe-alt';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import IHNewspaper from '~icons/heroicons-outline/newspaper';
import IHUserGroup from '~icons/heroicons-outline/user-group';

function getSettingsRoute(
  ctx: NavContext,
  tab: string,
  { name, hidden }: { name: string; hidden?: boolean }
): NavigationItem {
  return {
    name,
    link: { name: 'space-settings', params: { tab } },
    active: ctx.route.params.tab === tab,
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

function getSpaceSettingsConfig(ctx: NavContext): NavigationConfig {
  const isOffchainNetwork = ctx.space
    ? offchainNetworks.includes(ctx.space.network)
    : false;

  const tabItems = Object.fromEntries(
    SETTINGS_TABS.map(({ key, tab, name, offchainOnly, onchainOnly }) => [
      key,
      getSettingsRoute(ctx, tab ?? key, {
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

function canSeeSettings(ctx: NavContext): boolean {
  const isOwner =
    ctx.ensOwner && compareAddresses(ctx.ensOwner, ctx.web3.account);
  if (ctx.isController || isOwner) return true;

  if (ctx.space?.additionalRawData?.type === 'offchain') {
    const admins = ctx.space.additionalRawData.admins.map((admin: string) =>
      admin.toLowerCase()
    );

    return admins.includes(ctx.web3.account.toLowerCase());
  }

  return false;
}

function getSpaceMainConfig(ctx: NavContext): NavigationConfig {
  const items: Record<string, NavigationItem> = {
    overview: { name: 'Overview', icon: IHGlobeAlt },
    proposals: { name: 'Proposals', icon: IHNewspaper },
    leaderboard: { name: 'Leaderboard', icon: IHUserGroup }
  };

  if (ctx.space?.delegations && ctx.space.delegations.length > 0) {
    items.delegates = { name: 'Delegates', icon: IHLightningBolt };
  }

  if (SPACES_DISCUSSIONS[`${ctx.networkId}:${ctx.address}`]) {
    items.discussions = {
      name: 'Discussions',
      icon: IHAnnotation,
      active: ['space-discussions', 'space-discussions-topic'].includes(
        ctx.route.name as string
      )
    };
  }

  if (ctx.space?.treasuries?.length) {
    items.treasury = { name: 'Treasury', icon: IHCash };
  }

  if (canSeeSettings(ctx)) {
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
  getConfig(ctx: NavContext): NavigationConfig {
    if (ctx.route.name === 'space-settings') {
      return getSpaceSettingsConfig(ctx);
    }
    return getSpaceMainConfig(ctx);
  }
};
