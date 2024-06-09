<script lang="ts" setup>
import { compareAddresses } from '@/helpers/utils';

import IHGlobeAlt from '~icons/heroicons-outline/globe-alt';
import IHNewspaper from '~icons/heroicons-outline/newspaper';
import IHCash from '~icons/heroicons-outline/cash';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import IHCog from '~icons/heroicons-outline/cog';
import IHUsers from '~icons/heroicons-outline/users';
import IHUserGroup from '~icons/heroicons-outline/user-group';
import IHUser from '~icons/heroicons-outline/user';
import IHStop from '~icons/heroicons-outline/stop';
import IHGlobe from '~icons/heroicons-outline/globe-americas';
import IHHome from '~icons/heroicons-outline/home';
import IHBell from '~icons/heroicons-outline/bell';

const route = useRoute();
const uiStore = useUiStore();
const spacesStore = useSpacesStore();
const notificationsStore = useNotificationsStore();

const { param } = useRouteParser('id');
const { resolved, address, networkId } = useResolve(param);
const { web3 } = useWeb3();

const currentRouteName = computed(() => String(route.matched[0]?.name));
const space = computed(() =>
  currentRouteName.value === 'space' && resolved.value
    ? spacesStore.spacesMap.get(`${networkId.value}:${address.value}`)
    : null
);

const isController = computed(() =>
  space.value ? compareAddresses(space.value.controller, web3.value.account) : false
);
const navigationConfig = computed(() => ({
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
    ...(space.value?.treasuries?.length
      ? {
          treasury: {
            name: 'Treasury',
            icon: IHCash
          }
        }
      : undefined),
    ...(isController.value
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
      icon: IHStop
    },
    contacts: {
      name: 'Contacts',
      icon: IHUsers
    }
  },
  my: {
    home: {
      name: 'Home',
      icon: IHHome
    },
    explore: {
      name: 'Explore',
      icon: IHGlobe
    },
    notifications: {
      name: 'Notifications',
      count: notificationsStore.unreadNotificationsCount,
      icon: IHBell
    }
  }
}));
const shortcuts = computed(() => {
  return {
    ...(web3.value.account
      ? {
          my: {
            user: {
              name: 'Profile',
              link: { name: 'user', params: { id: web3.value.account } },
              icon: IHUser,
              active: (route.name as string) === 'user' && route.params.id === web3.value.account
            },
            settings: {
              name: 'Settings',
              link: { name: 'settings-spaces' },
              icon: IHCog,
              active: false
            }
          }
        }
      : {})
  };
});
const navigationItems = computed(() => navigationConfig.value[currentRouteName.value || '']);
</script>

<template>
  <div
    v-if="navigationItems"
    class="lg:visible fixed w-[240px] border-r left-[72px] top-0 bottom-0 z-10 bg-skin-bg"
    :class="{
      invisible: !uiStore.sidebarOpen
    }"
  >
    <div class="h-[72px] border-b" />
    <div class="py-4">
      <router-link
        v-for="(item, key) in navigationItems"
        :key="key"
        :to="{ name: `${currentRouteName}-${key}` }"
        class="px-4 py-1.5 space-x-2 flex items-center"
        :class="route.name === `${currentRouteName}-${key}` ? 'text-skin-link' : 'text-skin-text'"
      >
        <component :is="item.icon" class="inline-block"></component>
        <span class="grow" v-text="item.name" />
        <span
          v-if="item.count"
          class="bg-skin-border text-skin-link text-[13px] rounded-full px-1.5"
          v-text="item.count"
        />
      </router-link>
      <router-link
        v-for="(item, key) in shortcuts[currentRouteName]"
        :key="key"
        :to="item.link"
        class="px-4 py-1.5 space-x-2 flex items-center"
        :class="item.active ? 'text-skin-link' : 'text-skin-text'"
      >
        <component :is="item.icon" class="inline-block"></component>
        <span v-text="item.name" />
      </router-link>
    </div>
  </div>
</template>
