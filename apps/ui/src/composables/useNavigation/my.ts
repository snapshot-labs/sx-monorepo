import { NavigationConfig, NavContext } from '.';
import IHBell from '~icons/heroicons-outline/bell';
import IHCog from '~icons/heroicons-outline/cog';
import IHGlobe from '~icons/heroicons-outline/globe-americas';
import IHHome from '~icons/heroicons-outline/home';
import IHUser from '~icons/heroicons-outline/user';

export default {
  routeName: 'my',
  getConfig({ account, route, unreadCount }: NavContext): NavigationConfig {
    return {
      items: {
        home: {
          name: 'Home',
          icon: IHHome,
          hidden: !account
        },
        explore: {
          name: 'Explore',
          icon: IHGlobe
        },
        notifications: {
          name: 'Notifications',
          count: unreadCount,
          icon: IHBell,
          hidden: !account
        },
        user: {
          name: 'Profile',
          link: { name: 'user', params: { user: account } },
          icon: IHUser,
          hidden: !account,
          active:
            (route.name as string) === 'user' && route.params.user === account
        },
        settings: {
          name: 'Settings',
          link: { name: 'settings-spaces' },
          icon: IHCog,
          hidden: !account
        }
      }
    };
  }
};
