<script setup lang="ts">
import { getStampUrl } from '@/helpers/utils';

withDefaults(
  defineProps<{
    type?: 'avatar' | 'space' | 'space-sx' | 'token';
    id: string;
    size?: number;
    cb?: string;
  }>(),
  {
    type: 'avatar',
    size: 22
  }
);
</script>

<template>
  <img
    :src="getStampUrl(type, id, size, cb)"
    class="rounded-full inline-block bg-[color:var(--border-color)]"
    :style="{
      width: `${size}px`,
      height: `${size}px`
    }"
  />
</template>
