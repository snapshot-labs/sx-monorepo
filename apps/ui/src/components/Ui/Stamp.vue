<script setup lang="ts">
import { getStampUrl } from '@/helpers/utils';

withDefaults(
  defineProps<{
    type?:
      | 'avatar'
      | 'user-cover'
      | 'space'
      | 'space-cover'
      | 'space-logo'
      | 'token';
    id: string;
    size?: number;
    width?: number;
    height?: number;
    cb?: string;
    cropped?: boolean;
  }>(),
  {
    type: 'avatar',
    size: 22,
    cropped: true
  }
);
</script>

<template>
  <img
    :key="cb"
    :src="
      getStampUrl(
        type,
        id,
        width && height ? { width, height } : size,
        cb,
        cropped
      )
    "
    class="rounded-full inline-block bg-skin-border"
    :style="
      !width && !height
        ? {
            [`${cropped ? '' : 'max-'}width`]: `${size}px`,
            [`${cropped ? '' : 'max-'}height`]: `${size}px`
          }
        : {}
    "
  />
</template>
