<script setup lang="ts">
import type { Placement } from 'tippy.js';

defineProps<{
  title: string;
  placement?: Placement;
}>();
</script>

<template>
  <div v-tippy="{ content: title, placement }" class="inline-block relative">
    <slot />
  </div>
</template>
