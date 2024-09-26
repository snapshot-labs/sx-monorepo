<script setup lang="ts">
import IHBell from '~icons/heroicons-outline/bell';
import IHGlobe from '~icons/heroicons-outline/globe-americas';
import IHHome from '~icons/heroicons-outline/home';
import IHUser from '~icons/heroicons-outline/user';

const emit = defineEmits<{
  (e: 'navigated');
}>();

const { web3 } = useWeb3();
const route = useRoute();

const menu = [
  {
    label: 'Home',
    link: { name: 'my-home' },
    icon: IHHome
  },
  {
    label: 'Explore',
    link: { name: 'my-explore' },
    icon: IHGlobe
  },
  {
    label: 'Notifications',
    link: { name: 'my-notifications' },
    icon: IHBell
  },
  {
    label: 'Profile',
    link: { name: 'user', params: { user: web3.value.account } },
    icon: IHUser
  }
];
</script>

<template>
  <nav class="bg-skin-bg border-t text-xs">
    <div class="flex gap-2 px-3 justify-center">
      <AppLink
        v-for="(item, i) in menu"
        :key="i"
        :to="item.link"
        class="inline-flex flex-col text-center gap-1 truncate justify-center w-[25%] max-w-[120px]"
        :class="
          route.name === item.link.name ? 'text-skin-link' : 'text-skin-text'
        "
        @click="emit('navigated')"
      >
        <component :is="item.icon" class="mx-auto" />
        <span class="truncate" v-text="item.label" />
      </AppLink>
    </div>
  </nav>
</template>
