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
    :class="[isActive && 'border-b border-skin-link mb-[-1px]']"
  >
    <h4
      class="eyebrow py-2 cursor-pointer inline-block hover:text-skin-link"
      :class="[isActive ? 'text-skin-link' : 'text-skin-text']"
      v-text="text"
    />
    <span
      v-if="count"
      class="inline-block bg-skin-border text-skin-link text-[13px] rounded-full px-1.5 ml-2"
      v-text="_n(count, 'compact')"
    />
  </div>
</template>
