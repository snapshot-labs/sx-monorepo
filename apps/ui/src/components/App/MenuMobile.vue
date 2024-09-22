<script setup lang="ts">
import IHBell from '~icons/heroicons-outline/bell';
import IHGlobe from '~icons/heroicons-outline/globe-americas';
import IHHome from '~icons/heroicons-outline/home';
import IHUser from '~icons/heroicons-outline/user';

const emit = defineEmits<{
  (e: 'navigated');
}>();

const { web3 } = useWeb3();

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
  <nav
    class="bg-skin-bg grid grid-cols-4 gap-2 border-t text-xs px-3 items-center"
  >
    <div
      v-for="(item, i) in menu"
      :key="i"
      class="flex justify-center truncate"
    >
      <AppLink
        :to="item.link"
        class="inline-flex flex-col text-center gap-1 truncate"
        @click="emit('navigated')"
      >
        <component :is="item.icon" class="mx-auto" />
        <span class="truncate" v-text="item.label" />
      </AppLink>
    </div>
  </nav>
</template>
