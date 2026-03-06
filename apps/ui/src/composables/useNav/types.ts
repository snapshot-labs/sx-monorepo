import { FunctionalComponent } from 'vue';
import { RouteLocationNormalizedLoaded, RouteLocationRaw } from 'vue-router';
import { Organization } from '@/helpers/organizations';
import { Space } from '@/types';
import { SpaceType } from '../useTownhallSpace';

export type NavItem = {
  name: string;
  icon?: FunctionalComponent;
  count?: number;
  hidden?: boolean;
  link?: RouteLocationRaw;
  isActiveOnChildren?: boolean;
  /** 1-based insertion index used by org nav to position custom items among defaults */
  position?: number;
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
  spaceType: SpaceType;
  isController: boolean;
  ensOwner: string | null;
  organization: Organization | null;
};

export type NavProvider = {
  routeName: string;
  isVisible?: (context: NavContext) => boolean;
  getConfig: (context: NavContext) => NavConfig | null;
};
