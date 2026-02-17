import { metadataNetwork } from '@/networks';
import { NavContext, NavigationConfig } from '.';
import IHAtSymbol from '~icons/heroicons-outline/at-symbol';
import IHStop from '~icons/heroicons-outline/stop';
import IHUsers from '~icons/heroicons-outline/users';

export default {
  routeName: 'settings',
  getConfig(ctx: NavContext): NavigationConfig {
    return {
      items: {
        spaces: {
          name: 'My spaces',
          icon: IHStop,
          hidden: ctx.isWhiteLabel
        },
        contacts: {
          name: 'Contacts',
          icon: IHUsers
        },
        'email-notifications': {
          name: 'Email notifications',
          icon: IHAtSymbol,
          hidden: metadataNetwork !== 's' || ctx.isWhiteLabel
        }
      }
    };
  }
};
