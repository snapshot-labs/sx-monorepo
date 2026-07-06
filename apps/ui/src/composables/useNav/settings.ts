import { metadataNetwork } from '@/networks';
import { NavConfig, NavContext } from './types';
import IHAtSymbol from '~icons/heroicons-outline/at-symbol';
import IHKey from '~icons/heroicons-outline/key';
import IHStop from '~icons/heroicons-outline/stop';
import IHUsers from '~icons/heroicons-outline/users';

export default {
  routeName: 'settings',
  isVisible({ route }: NavContext) {
    return route.name !== 'settings-alias-authorize';
  },
  getConfig({ route, isWhiteLabel }: NavContext): NavConfig {
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
        aliases: {
          name: 'Aliases',
          icon: IHKey
        },
        notifications: {
          name: 'Notifications',
          icon: IHAtSymbol,
          hidden: metadataNetwork !== 's' || isWhiteLabel
        },
        'api-keys': {
          name: 'API keys',
          icon: IHKey,
          // Not discoverable from the menu yet: only shown while on the page
          hidden: route.name !== 'settings-api-keys'
        }
      }
    };
  }
};
