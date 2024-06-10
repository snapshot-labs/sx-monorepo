<script setup lang="ts">
import { getCacheHash, getStampUrl, getUrl } from '@/helpers/utils';

defineProps<{
  user: {
    id: string;
    avatar?: string;
    cover?: string;
  };
}>();
</script>

<template>
  <img v-if="user.cover" :src="getUrl(user.cover)!" class="object-cover" alt="" />
  <div
    v-else
    class="user-fallback-cover"
    :style="{
      'background-image': `url(${getStampUrl('avatar', user.id, 50, getCacheHash(user.avatar))}`
    }"
  ></div>
</template>

<style lang="scss" scoped>
.user-fallback-cover {
  object-fit: cover;

  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    backdrop-filter: blur(50px) contrast(0.9) saturate(1.3);
    pointer-events: none;
  }
}
</style>
