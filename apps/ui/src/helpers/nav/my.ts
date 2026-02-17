import { NavContext, NavigationConfig } from '.';
import IHBell from '~icons/heroicons-outline/bell';
import IHCog from '~icons/heroicons-outline/cog';
import IHGlobe from '~icons/heroicons-outline/globe-americas';
import IHHome from '~icons/heroicons-outline/home';
import IHUser from '~icons/heroicons-outline/user';

export default {
  routeName: 'my',
  getConfig(ctx: NavContext): NavigationConfig {
    return {
      items: {
        home: {
          name: 'Home',
          icon: IHHome,
          hidden: !ctx.web3.account
        },
        explore: {
          name: 'Explore',
          icon: IHGlobe
        },
        notifications: {
          name: 'Notifications',
          count: ctx.notificationsStore.unreadNotificationsCount,
          icon: IHBell,
          hidden: !ctx.web3.account
        },
        user: {
          name: 'Profile',
          link: { name: 'user', params: { user: ctx.web3.account } },
          icon: IHUser,
          hidden: !ctx.web3.account,
          active:
            (ctx.route.name as string) === 'user' &&
            ctx.route.params.user === ctx.web3.account
        },
        settings: {
          name: 'Settings',
          link: { name: 'settings-spaces' },
          icon: IHCog,
          hidden: !ctx.web3.account
        }
      }
    };
  }
};
