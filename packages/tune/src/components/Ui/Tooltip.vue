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
    v-tippy="title ? { content: title, placement, touch } : undefined"
    :aria-label="title || undefined"
    class="inline-block relative"
  >
    <slot />
  </div>
</template>

<style lang="scss">
@import 'tippy.js/dist/tippy.css';
@import 'tippy.js/dist/border.css';
@import 'tippy.js/dist/svg-arrow.css';

.tippy-box {
  @apply bg-skin-border text-skin-link px-[14px] py-2 w-max z-50 rounded text-[17px] leading-5 transition-opacity;

  .tippy-content {
    @apply p-0;
  }

  .tippy-arrow {
    @apply text-skin-border;
  }
}

div[data-tippy-root] {
  @apply break-words;
}
</style>
