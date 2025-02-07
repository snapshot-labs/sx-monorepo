<script lang="ts" setup>
import { FunctionalComponent } from 'vue';
import { SPACES_DISCUSSIONS } from '@/helpers/discourse';
import { compareAddresses } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import IHAnnotation from '~icons/heroicons-outline/annotation';
import IHBell from '~icons/heroicons-outline/bell';
import IHCash from '~icons/heroicons-outline/cash';
import IHCog from '~icons/heroicons-outline/cog';
import IHGlobeAlt from '~icons/heroicons-outline/globe-alt';
import IHGlobe from '~icons/heroicons-outline/globe-americas';
import IHHome from '~icons/heroicons-outline/home';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import IHNewspaper from '~icons/heroicons-outline/newspaper';
import IHStop from '~icons/heroicons-outline/stop';
import IHUser from '~icons/heroicons-outline/user';
import IHUserGroup from '~icons/heroicons-outline/user-group';
import IHUsers from '~icons/heroicons-outline/users';

type NavigationItem = {
  name: string;
  icon: FunctionalComponent;
  count?: number;
  hidden?: boolean;
  link?: any;
  active?: boolean;
};

const route = useRoute();
const spacesStore = useSpacesStore();
const notificationsStore = useNotificationsStore();
const { isWhiteLabel } = useWhiteLabel();

const { param } = useRouteParser('space');
const { resolved, address, networkId } = useResolve(param);
const { web3 } = useWeb3();

const currentRouteName = computed(() => String(route.matched[0]?.name));
const space = computed(() =>
  currentRouteName.value === 'space' && resolved.value
    ? spacesStore.spacesMap.get(`${networkId.value}:${address.value}`)
    : null
);

const isController = computedAsync(async () => {
  if (!networkId.value || !space.value) return false;

  const { account } = web3.value;

  const network = getNetwork(networkId.value);
  const controller = await network.helpers.getSpaceController(space.value);

  return compareAddresses(controller, account);
});

const canSeeSettings = computed(() => {
  if (isController.value) return true;

  if (space.value?.additionalRawData?.type === 'offchain') {
    const admins = space.value?.additionalRawData?.admins.map((admin: string) =>
      admin.toLowerCase()
    );

    return admins.includes(web3.value.account.toLowerCase());
  }
});

const navigationConfig = computed<
  Record<string, Record<string, NavigationItem>>
>(() => ({
  space: {
    overview: {
      name: 'Overview',
      icon: IHGlobeAlt
    },
    proposals: {
      name: 'Proposals',
      icon: IHNewspaper
    },
    leaderboard: {
      name: 'Leaderboard',
      icon: IHUserGroup
    },
    ...(space.value?.delegations && space.value.delegations.length > 0
      ? {
          delegates: {
            name: 'Delegates',
            icon: IHLightningBolt
          }
        }
      : undefined),
    ...(SPACES_DISCUSSIONS[`${networkId.value}:${address.value}`]
      ? {
          discussions: {
            name: 'Discussions',
            icon: IHAnnotation,
            active: ['space-discussions', 'space-discussions-topic'].includes(
              route.name as string
            )
          }
        }
      : undefined),
    ...(space.value?.treasuries?.length
      ? {
          treasury: {
            name: 'Treasury',
            icon: IHCash
          }
        }
      : undefined),
    ...(canSeeSettings.value
      ? {
          settings: {
            name: 'Settings',
            icon: IHCog
          }
        }
      : undefined)
  },
  settings: {
    spaces: {
      name: 'My spaces',
      icon: IHStop,
      hidden: isWhiteLabel.value
    },
    contacts: {
      name: 'Contacts',
      icon: IHUsers
    }
  },
  my: {
    home: {
      name: 'Home',
      icon: IHHome,
      hidden: !web3.value.account
    },
    explore: {
      name: 'Explore',
      icon: IHGlobe
    },
    notifications: {
      name: 'Notifications',
      count: notificationsStore.unreadNotificationsCount,
      icon: IHBell,
      hidden: !web3.value.account
    }
  }
}));
const shortcuts = computed<Record<string, Record<string, NavigationItem>>>(
  () => {
    return {
      my: {
        user: {
          name: 'Profile',
          link: { name: 'user', params: { user: web3.value.account } },
          icon: IHUser,
          hidden: !web3.value.account,
          active:
            (route.name as string) === 'user' &&
            route.params.user === web3.value.account
        },
        settings: {
          name: 'Settings',
          link: { name: 'settings-spaces' },
          icon: IHCog,
          hidden: !web3.value.account,
          active: false
        }
      }
    };
  }
);
const navigationItems = computed(() =>
  Object.fromEntries(
    Object.entries({
      ...navigationConfig.value[currentRouteName.value],
      ...shortcuts.value[currentRouteName.value]
    })
      .map(([key, item]): [string, NavigationItem] => {
        return [
          key,
          {
            ...item,
            active:
              item.active ?? route.name === `${currentRouteName.value}-${key}`,
            hidden: item.hidden ?? false,
            link: item.link ?? { name: `${currentRouteName.value}-${key}` }
          }
        ];
      })
      .filter(([, item]) => item.hidden === false)
  )
);
</script>

<template>
  <div class="border-r bg-skin-bg py-4">
    <AppLink
      v-for="(item, key) in navigationItems"
      :key="key"
      :to="item.link"
      class="px-4 py-1.5 space-x-2 flex items-center"
      :class="item.active ? 'text-skin-link' : 'text-skin-text'"
    >
      <component :is="item.icon" class="inline-block"></component>
      <span class="grow" v-text="item.name" />
      <span
        v-if="item.count"
        class="bg-skin-border text-skin-link text-[13px] rounded-full px-1.5"
        v-text="item.count"
      />
    </AppLink>
  </div>
</template>
