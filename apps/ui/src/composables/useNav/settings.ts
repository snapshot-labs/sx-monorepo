import { metadataNetwork } from '@/networks';
import { NavConfig, NavContext } from './types';
import IHAtSymbol from '~icons/heroicons-outline/at-symbol';
import IHCode from '~icons/heroicons-outline/code';
import IHKey from '~icons/heroicons-outline/key';
import IHUsers from '~icons/heroicons-outline/users';
import IHViewGrid from '~icons/heroicons-outline/view-grid';

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
          icon: IHViewGrid,
          hidden: isWhiteLabel
        },
        notifications: {
          name: 'Notifications',
          icon: IHAtSymbol,
          hidden: metadataNetwork !== 's' || isWhiteLabel
        },
        contacts: {
          name: 'Contacts',
          icon: IHUsers
        },
        aliases: {
          name: 'Aliases',
          icon: IHKey
        },
        'api-keys': {
          name: 'API keys',
          icon: IHCode
        }
      }
    };
  }
};
