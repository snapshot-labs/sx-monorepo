<script setup>
import { _t } from '@/helpers/utils';

defineProps({
  open: Boolean,
  proposal: Object
});

defineEmits(['close']);

const labels = {
  created: 'Created',
  start: 'Start',
  min_end: 'Min. end',
  max_end: 'Max. end'
};
const states = Object.keys(labels);
const now = parseInt((Date.now() / 1e3).toFixed());
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Timeline'" />
    </template>
    <div class="p-4 flex flex-column">
      <div class="mt-1 ml-2">
        <div
          v-for="(state, i) in ['created', 'start', 'min_end', 'max_end']"
          :key="state"
          class="flex relative h-[60px]"
        >
          <div
            class="absolute w-[15px] h-[15px] inline-block rounded-full -left-[7px] border-[4px] border-skin-bg"
            :class="proposal[state] <= now ? 'bg-skin-heading' : 'bg-gray-600'"
          />
          <div
            v-if="states[i + 1]"
            class="border-l pr-4 mt-3"
            :class="proposal[states[i + 1]] <= now && 'border-skin-heading'"
          />
        </div>
      </div>
      <div class="flex-auto leading-6">
        <div
          v-for="state in ['created', 'start', 'min_end', 'max_end']"
          :key="state"
          class="mb-3 last:mb-0 h-[44px]"
        >
          <h4 v-text="labels[state]" />
          {{ _t(proposal[state]) }}
        </div>
      </div>
    </div>
  </UiModal>
</template>
