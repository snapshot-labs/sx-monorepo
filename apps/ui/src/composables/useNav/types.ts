import { FunctionalComponent } from 'vue';
import { RouteLocationNormalizedLoaded, RouteLocationRaw } from 'vue-router';
import { Space } from '@/types';

export type NavItem = {
  name: string;
  icon?: FunctionalComponent;
  count?: number;
  hidden?: boolean;
  link?: RouteLocationRaw;
  active?: boolean;
};

export type NavConfig = {
  slim?: boolean;
  items: Record<string, NavItem>;
};

export type NavContext = {
  route: RouteLocationNormalizedLoaded;
  account: string;
  unreadCount: number;
  isWhiteLabel: boolean;
  space: Space | null;
  isController: boolean;
  ensOwner: string | null;
};

export type NavProvider = {
  routeName: string;
  isVisible?: (context: NavContext) => boolean;
  getConfig: (context: NavContext) => NavConfig | null;
};
