import { FunctionalComponent } from 'vue';
import { RouteLocationNormalizedLoaded, RouteLocationRaw } from 'vue-router';
import { NetworkID, Space } from '@/types';

export type NavigationItem = {
  name: string;
  icon?: FunctionalComponent;
  count?: number;
  hidden?: boolean;
  link?: RouteLocationRaw;
  active?: boolean;
};

export type NavigationConfig = {
  style?: 'default' | 'slim';
  items: Record<string, NavigationItem>;
};

export type NavContext = {
  route: RouteLocationNormalizedLoaded;
  account: string;
  unreadCount: number;
  isWhiteLabel: boolean;
  space: Space | null;
  networkId: NetworkID | null;
  address: string | null;
  isController: boolean;
  ensOwner: string | null;
};

export type NavProvider = {
  routeName: string;
  getConfig: (context: NavContext) => NavigationConfig;
};
