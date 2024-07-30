<script setup lang="ts">
import { Props } from 'tippy.js';

withDefaults(
  defineProps<{
    title: string;
    placement?: Props['placement'];
    touch?: Props['touch'];
  }>(),
  {
    placement: 'top',
    touch: false
  }
);
</script>

<template>
  <div
    v-tippy="{ content: title, placement, touch }"
    class="inline-block relative"
  >
    <slot />
  </div>
</template>
