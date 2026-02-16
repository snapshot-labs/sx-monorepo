<script setup lang="ts">
import { _n } from '@/helpers/utils';

const props = defineProps<{
  text: string;
  isActive?: boolean;
  count?: number;
  size?: 'md' | 'lg';
}>();

const isLarge = computed(() => props.size === 'lg');
</script>

<template>
  <div
    class="flex items-center mb-[-1px]"
    :class="[
      isLarge
        ? [
            'border-b-[2px]',
            isActive ? 'border-skin-link' : 'border-transparent'
          ]
        : { 'border-b border-skin-link': isActive }
    ]"
  >
    <span
      v-if="isLarge"
      class="py-2 text-[19px] font-bold cursor-pointer inline-block hover:text-skin-link"
      :class="[isActive ? 'text-skin-link' : 'text-skin-text']"
    >
      {{ text }}
    </span>
    <UiEyebrow
      v-else
      class="py-2 cursor-pointer inline-block hover:text-skin-link"
      :class="[isActive ? 'text-skin-link' : 'text-skin-text']"
    >
      {{ text }}
    </UiEyebrow>
    <UiPill v-if="count" class="ml-2" v-text="_n(count, 'compact')" />
  </div>
</template>
