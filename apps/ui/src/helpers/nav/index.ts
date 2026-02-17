import { FunctionalComponent } from 'vue';
import { RouteLocationNormalizedLoaded } from 'vue-router';
import { NetworkID, Space } from '@/types';
import my from './my';
import settings from './settings';
import space from './space';

export type NavigationItem = {
  name: string;
  icon?: FunctionalComponent;
  count?: number;
  hidden?: boolean;
  link?: any;
  active?: boolean;
};

export type NavigationConfig = {
  style?: 'default' | 'slim';
  items: Record<string, NavigationItem>;
};

export type NavContext = {
  route: RouteLocationNormalizedLoaded;
  web3: { account: string };
  space: Space | null;
  networkId: NetworkID | null;
  address: string | null;
  isController: boolean;
  ensOwner: string | null;
  isWhiteLabel: boolean;
  notificationsStore: { unreadNotificationsCount: number };
};

export type NavProvider = {
  routeName: string;
  getConfig: (ctx: NavContext) => NavigationConfig;
};

const providers: NavProvider[] = [space, settings, my];

export function getNavConfig(
  routeName: string,
  ctx: NavContext
): NavigationConfig | null {
  const provider = providers.find(p => p.routeName === routeName);
  if (!provider) return null;

  const config = provider.getConfig(ctx);
  const items = Object.fromEntries(
    Object.entries(config.items)
      .map(([key, item]): [string, NavigationItem] => [
        key,
        {
          ...item,
          active: item.active ?? ctx.route.name === `${routeName}-${key}`,
          hidden: item.hidden ?? false,
          link: item.link ?? { name: `${routeName}-${key}` }
        }
      ])
      .filter(([, item]) => !item.hidden)
  );

  return { ...config, items };
}
