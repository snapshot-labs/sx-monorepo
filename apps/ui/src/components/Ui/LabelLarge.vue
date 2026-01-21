<script setup lang="ts">
import { _n } from '@/helpers/utils';

defineProps<{
  text: string;
  isActive?: boolean;
  count?: number;
}>();
</script>

<template>
  <div
    class="flex items-center"
    :class="[isActive && 'border-b-2 border-skin-link mb-[-2px]']"
  >
    <span
      class="py-2 text-[19px] font-bold cursor-pointer inline-block hover:text-skin-link"
      :class="[isActive ? 'text-skin-link' : 'text-skin-text']"
      >{{ text }}</span
    >
    <span
      v-if="count"
      class="inline-block bg-skin-border text-skin-link text-[13px] rounded-full px-1.5 ml-2"
      v-text="_n(count, 'compact')"
    />
  </div>
</template>
