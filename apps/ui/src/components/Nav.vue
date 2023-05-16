<script lang="ts" setup>
import { useUiStore } from '@/stores/ui';
import { useSpacesStore } from '@/stores/spaces';

// TODO: need to import all icons https://github.com/antfu/unplugin-icons/issues/5
// move to this when stable to avoid imports https://www.npmjs.com/package/@iconify/tailwind
import IHGlobeAlt from '~icons/heroicons-outline/globe-alt';
import IHNewspaper from '~icons/heroicons-outline/newspaper';
import IHCash from '~icons/heroicons-outline/cash';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import IHCog from '~icons/heroicons-outline/cog';
import IHUsers from '~icons/heroicons-outline/users';
import IHStop from '~icons/heroicons-outline/stop';

const route = useRoute();
const uiStore = useUiStore();
const spacesStore = useSpacesStore();

const { param } = useRouteParser('id');
const { resolved, address, networkId } = useResolve(param);
const currentRouteName = computed(() => String(route.matched[0]?.name));
const space = computed(() =>
  currentRouteName.value === 'space' && resolved.value
    ? spacesStore.spacesMap.get(`${networkId.value}:${address.value}`)
    : null
);
const { treasury } = useTreasury(space);

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
    ...(space.value?.delegation_api_url
      ? {
          delegates: {
            name: 'Delegates',
            icon: IHLightningBolt
          }
        }
      : undefined),
    ...(treasury.value
      ? {
          treasury: {
            name: 'Treasury',
            icon: IHCash
          }
        }
      : undefined),
    settings: {
      name: 'Settings',
      icon: IHCog
    }
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
  }
}));
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
        class="px-4 py-[6px] space-x-2 text-skin-text flex items-center"
        :class="route.name === `${currentRouteName}-${key}` && 'text-skin-link'"
      >
        <component :is="item.icon" class="inline-block"></component>
        <span v-text="item.name" />
      </router-link>
    </div>
  </div>
</template>
