import { metadataNetwork } from '@/networks';
import { NavConfig, NavContext } from './types';
import IHAtSymbol from '~icons/heroicons-outline/at-symbol';
import IHStop from '~icons/heroicons-outline/stop';
import IHUsers from '~icons/heroicons-outline/users';

export default {
  routeName: 'settings',
  isVisible({ route }: NavContext) {
    return route.name !== 'settings-alias-authorize';
  },
  getConfig({ isWhiteLabel }: NavContext): NavConfig {
    return {
      items: {
        spaces: {
          name: 'My spaces',
          icon: IHStop,
          hidden: isWhiteLabel
        },
        contacts: {
          name: 'Contacts',
          icon: IHUsers
        },
        'email-notifications': {
          name: 'Email notifications',
          icon: IHAtSymbol,
          hidden: metadataNetwork !== 's' || isWhiteLabel
        }
      }
    };
  }
};
