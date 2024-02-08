<script setup lang="ts">
defineProps<{ plugin: any }>();
</script>

<template>
  <router-link
    :to="{ name: 'plugin', params: { id: plugin.id } }"
    class="border rounded-lg p-3 leading-6"
  >
    <img :src="plugin.avatar" class="w-[32px] h-[32px] rounded-lg mb-2" />
    <h4 v-text="plugin.name" />
    <div class="text-skin-text text-sm" v-text="plugin.category" />
  </router-link>
</template>
