<script setup lang="ts">
import { getCacheHash, getStampUrl } from '@/helpers/utils';

const props = defineProps<{
  user: {
    id: string;
    avatar?: string;
    cover?: string;
  };
}>();

const cb = computed(() => getCacheHash(props.user.cover));
</script>

<template>
  <UiStamp
    v-if="user.cover"
    :id="user.id"
    :width="1500"
    :height="156"
    :cb="cb"
    type="space-cover-sx"
    class="object-cover"
  />
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
