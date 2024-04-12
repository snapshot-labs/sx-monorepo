<script lang="ts" setup>
import IHGlobe from '~icons/heroicons-outline/globe-americas';
import IHHome from '~icons/heroicons-outline/home';

const route = useRoute();
const uiStore = useUiStore();

const navigationConfig = computed(() => ({
  home: {
    name: 'Home',
    icon: IHHome
  },
  explore: {
    name: 'Explore',
    icon: IHGlobe
  }
}));
</script>

<template>
  <div
    class="lg:visible fixed w-[240px] border-r left-[72px] top-0 bottom-0 z-10 bg-skin-bg"
    :class="{
      invisible: !uiStore.sidebarOpen
    }"
  >
    <div class="h-[72px] border-b" />
    <div class="py-4">
      <router-link
        v-for="(item, key) in navigationConfig"
        :key="key"
        :to="{ name: key }"
        class="px-4 py-1.5 space-x-2 flex items-center"
        :class="route.name === key ? 'text-skin-link' : 'text-skin-text'"
      >
        <component :is="item.icon" class="inline-block"></component>
        <span v-text="item.name" />
      </router-link>
    </div>
  </div>
</template>
