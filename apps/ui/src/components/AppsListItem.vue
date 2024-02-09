<script setup lang="ts">
defineProps<{ app: any }>();
</script>

<template>
  <router-link
    :to="{ name: 'app', params: { id: app.id } }"
    class="border rounded-lg p-3 leading-6"
  >
    <img :src="app.avatar" class="w-[32px] h-[32px] rounded-lg mb-2" />
    <h4 v-text="app.name" />
    <div class="text-skin-text text-sm" v-text="app.category" />
  </router-link>
</template>
