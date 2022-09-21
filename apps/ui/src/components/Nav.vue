<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();

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
  <div class="py-4">
    <router-link
      v-for="(item, i) in items"
      :key="i"
      :to="{ name: i }"
      class="px-4 py-2 block space-x-2 text-skin-text flex items-center"
      :class="route.name === i && 'text-skin-link'"
    >
      <IH-globe-alt v-if="i === 'overview'" class="inline-block" />
      <IH-newspaper v-if="i === 'proposals'" class="inline-block" />
      <IH-cash v-if="i === 'treasury'" class="inline-block" />
      <IH-cog v-if="i === 'settings'" class="inline-block" />
      <span v-text="item.name" />
    </router-link>
  </div>
</template>
