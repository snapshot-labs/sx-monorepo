import dayjs from 'dayjs';
import { h } from 'vue';
import { plusFees } from '@/composables/useSettings';
import {
  PLAN_BADGE_CLASSES,
  PLUS_LOW_CREDITS_PROPOSALS,
  PRO_AFTER_EXPIRATION_WARNING_DAYS,
  PRO_EXPIRATION_WARNING_DAYS
} from '@/helpers/constants';
import { SPACES_DISCUSSIONS } from '@/helpers/discourse';
import { _n, getProDaysLeft } from '@/helpers/utils';
import { explorePageProtocols, offchainNetworks } from '@/networks';
import { Space } from '@/types';
import { NavConfig, NavContext, NavItem } from './types';
import IHAnnotation from '~icons/heroicons-outline/annotation';
import IHArrowLongLeft from '~icons/heroicons-outline/arrow-long-left';
import IHBadgeCheck from '~icons/heroicons-outline/badge-check';
import IHCash from '~icons/heroicons-outline/cash';
import IHCog from '~icons/heroicons-outline/cog';
import IHDocumentText from '~icons/heroicons-outline/document-text';
import IHGlobeAlt from '~icons/heroicons-outline/globe-alt';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import IHNewspaper from '~icons/heroicons-outline/newspaper';
import IHUserGroup from '~icons/heroicons-outline/user-group';
import ISBadgeCheck from '~icons/heroicons-solid/badge-check';

const EXCLUDED_SUB_ROUTES = ['space-editor', 'space-proposal'];
const XMAQUINA_SPACE_ID = 's:xmaquina.eth';

function getSettingsRoute(
  tab: string,
  { name, hidden }: { name: string; hidden?: boolean }
): NavItem {
  return {
    name,
    link: { name: 'space-settings', params: { tab } },
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

export function getPlanItem(space: Space): NonNullable<NavConfig['header']> {
  const link = { name: 'space-upgrade' };
  const icon = () =>
    h(ISBadgeCheck, { class: PLAN_BADGE_CLASSES[space.plus ? 'plus' : 'pro'] });
  // The pill shows a short value, the tooltip the full detail
  if (space.plus) {
    const credits = space.credits ?? 0;
    const hasWarning =
      credits < PLUS_LOW_CREDITS_PROPOSALS * plusFees.value.proposal;
    const left = `${_n(credits, 'standard', { maximumFractionDigits: 4 })} ETH left`;
    return {
      name: 'Plus',
      value: `${_n(credits, 'standard', { maximumFractionDigits: 3 })} ETH`,
      detail: hasWarning ? `Only ${left}, add credits soon` : left,
      hasWarning,
      icon,
      link
    };
  }

  const daysLeft = getProDaysLeft(space.turbo_expiration || 0);
  const date = dayjs(space.turbo_expiration * 1e3).format('D MMM YYYY');
  if (daysLeft > PRO_EXPIRATION_WARNING_DAYS) {
    return { name: 'Pro', value: date, detail: `Until ${date}`, icon, link };
  }
  // Close to the end, the countdown matters more than the date
  if (daysLeft > 0) {
    return {
      name: 'Pro',
      value: `${daysLeft}d left`,
      detail: `Expires on ${date}`,
      hasWarning: true,
      icon,
      link
    };
  }
  // A Pro that just ended keeps its pill, so the space notices and renews
  if (daysLeft > -PRO_AFTER_EXPIRATION_WARNING_DAYS) {
    return {
      name: 'Pro',
      value: 'Expired',
      detail: `Expired on ${date}`,
      hasWarning: true,
      icon: IHBadgeCheck,
      link
    };
  }
  return { name: 'Upgrade space', icon: IHBadgeCheck, link };
}

function getSpaceSettingsConfig(context: NavContext): NavConfig {
  const isOffchainNetwork = context.space
    ? offchainNetworks.includes(context.space.network)
    : false;

  const tabItems = Object.fromEntries(
    SETTINGS_TABS.map(({ key, tab, name, offchainOnly, onchainOnly }) => [
      key,
      getSettingsRoute(tab ?? key, {
        name,
        hidden:
          (offchainOnly && !isOffchainNetwork) ||
          (onchainOnly && isOffchainNetwork)
      })
    ])
  );

  return {
    slim: true,
    items: {
      back: {
        name: 'Settings',
        icon: IHArrowLongLeft,
        link: { name: 'space-overview' },
        isActive: true
      },
      ...tabItems
    },
    header:
      isOffchainNetwork && context.space
        ? getPlanItem(context.space)
        : undefined
  };
}

function getSpaceMainConfig(context: NavContext): NavConfig {
  const items: Record<string, NavItem> = {
    overview: { name: 'Overview', icon: IHGlobeAlt },
    proposals: { name: 'Proposals', icon: IHNewspaper },
    leaderboard: { name: 'Leaderboard', icon: IHUserGroup }
  };

  if (
    context.space &&
    `${context.space.network}:${context.space.id}` === XMAQUINA_SPACE_ID
  ) {
    items.docs = {
      name: 'Docs',
      icon: IHDocumentText,
      link: 'https://docs.xmaquina.io/dao/governance'
    };
  }

  if (context.space?.delegations && context.space.delegations.length > 0) {
    items.delegates = { name: 'Delegates', icon: IHLightningBolt };
  }

  if (
    context.space &&
    SPACES_DISCUSSIONS[`${context.space.network}:${context.space.id}`]
  ) {
    items.discussions = {
      name: 'Discussions',
      icon: IHAnnotation
    };
  }

  if (context.space?.treasuries?.length) {
    items.treasury = {
      name: 'Treasury',
      icon: IHCash
    };
  }

  items.settings = {
    name: 'Settings',
    icon: IHCog,
    link: { name: 'space-settings', params: { tab: 'profile' } },
    hidden: explorePageProtocols.governor.protocols?.includes(
      context.space?.protocol ?? ''
    )
  };

  return { items };
}

export default {
  routeName: 'space',
  isVisible: ({ route }: NavContext) =>
    !EXCLUDED_SUB_ROUTES.includes(String(route.matched[1]?.name)),
  getConfig(context: NavContext): NavConfig | null {
    if (!context.space) return null;

    if (
      ['space-settings', 'space-upgrade'].includes(String(context.route.name))
    ) {
      return getSpaceSettingsConfig(context);
    }
    return getSpaceMainConfig(context);
  }
};
