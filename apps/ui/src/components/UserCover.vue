<script setup lang="ts">
import sha3 from 'js-sha3';
import { getCacheHash, getStampUrl } from '@/helpers/utils';

const props = defineProps<{
  user: {
    id: string;
    avatar?: string;
    cover?: string;
  };
}>();

const cb = computed(() =>
  props.user.cover ? sha3.sha3_256(props.user.cover).slice(0, 16) : undefined
);
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
