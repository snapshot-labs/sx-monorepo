<script setup lang="ts">
import { getUrl } from '@/helpers/utils';

defineProps<{ app: any }>();
</script>

<template>
  <a
    :href="app.link || app.website"
    target="_blank"
    class="border rounded-lg p-3 leading-6 relative group"
  >
    <img :src="getUrl(app.avatar) || ''" class="size-[32px] rounded-lg mb-2" />
    <IH-arrow-sm-right
      class="absolute top-3 right-3 -rotate-45 hidden group-hover:block"
    />
    <h4 v-text="app.name" />
    <div class="text-skin-text text-[17px]" v-text="app.category" />
  </a>
</template>
