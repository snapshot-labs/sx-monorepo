<script setup lang="ts">
import { ProposalState } from '@/types';

const titles: Record<ProposalState, string> = {
  pending: 'Pending',
  active: 'Active',
  passed: 'Passed',
  rejected: 'Rejected',
  executed: 'Executed'
};

const props = withDefaults(
  defineProps<{
    width?: number | string;
    height?: number | string;
    state: ProposalState;
  }>(),
  {
    width: 24,
    height: 24
  }
);

const style = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`
}));
</script>

<template>
  <UiTooltip :title="titles[state]">
    <IS-clock v-if="state === 'pending'" class="text-gray-400" :style="style" />
    <IS-status-online v-else-if="state === 'active'" class="text-skin-success" :style="style" />
    <IS-check-circle v-else-if="state === 'passed'" class="text-skin-link" :style="style" />
    <IS-play v-else-if="state === 'executed'" class="text-purple-500" :style="style" />
    <IS-x-circle v-else-if="state === 'rejected'" class="text-skin-danger" :style="style" />
  </UiTooltip>
</template>
