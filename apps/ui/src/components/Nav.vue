<script setup>
import { useRoute } from 'vue-router';
import { useUiStore } from '@/stores/ui';

const route = useRoute();
const uiStore = useUiStore();

const items = {
  overview: {
    name: 'Overview'
  },
  proposals: {
    name: 'Proposals'
  },
  treasury: {
    name: 'Treasury'
  },
  settings: {
    name: 'Settings'
  }
};
</script>
<template>
  <div
    v-if="route.matched[0]?.name === 'space'"
    class="lg:visible fixed w-[240px] border-r left-[72px] top-0 bottom-0 z-10 bg-skin-bg"
    :class="{
      invisible: !uiStore.sidebarOpen
    }"
  >
    <div class="h-[72px] border-b" />
    <div class="py-4">
      <router-link
        v-for="(item, i) in items"
        :key="i"
        :to="{ name: i }"
        class="px-4 py-[7px] block space-x-2 text-skin-text flex items-center"
        :class="route.name === i && 'text-skin-link'"
      >
        <IH-globe-alt v-if="i === 'overview'" class="inline-block" />
        <IH-newspaper v-if="i === 'proposals'" class="inline-block" />
        <IH-cash v-if="i === 'treasury'" class="inline-block" />
        <IH-cog v-if="i === 'settings'" class="inline-block" />
        <span v-text="item.name" />
      </router-link>
    </div>
  </div>
</template>
