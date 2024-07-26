<script setup lang="ts">
import { StrategyTemplate } from '@/networks/types';
import IHCode from '~icons/heroicons-outline/code';

defineProps<{
  disabled?: boolean;
  strategy: StrategyTemplate;
}>();
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    class="flex flex-col md:flex-row rounded-lg border cursor-pointer w-full text-left items-stretch overflow-hidden"
    :class="{
      'opacity-50 cursor-not-allowed': disabled
    }"
  >
    <div class="flex items-center justify-center min-h-[40px] bg-skin-border">
      <component
        :is="strategy.icon ? strategy.icon : IHCode"
        class="inline-block mx-3 text-skin-link"
      />
    </div>
    <div class="py-3 px-4">
      <h4 class="text-skin-link" v-text="strategy.name" />
      <div
        v-if="strategy.about"
        class="text-ellipsis"
        v-text="strategy.about"
      />
    </div>
  </button>
</template>
