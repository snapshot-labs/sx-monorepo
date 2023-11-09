<script setup lang="ts">
import { ProposalState } from '@/types';

const titles: Record<ProposalState, string> = {
  pending: 'Pending',
  active: 'Active',
  passed: 'Passed',
  rejected: 'Rejected',
  executed: 'Executed'
};

defineProps<{ state: ProposalState }>();
</script>

<template>
  <div
    :class="{
      'bg-gray-400': state === 'pending',
      'bg-green': state === 'active',
      'bg-skin-link': state === 'passed',
      'bg-purple-500': state === 'executed',
      'bg-red': state === 'rejected',
      '!text-skin-bg': state === 'passed'
    }"
    class="inline-block rounded-full pl-2 pr-[10px] pb-[2px] text-white mb-2"
  >
    <IS-clock v-if="state === 'pending'" class="text-white inline-block w-[17px] h-[17px]" />
    <IS-status-online
      v-else-if="state === 'active'"
      class="text-white inline-block w-[17px] h-[17px]"
    />
    <IS-check-circle
      v-else-if="state === 'passed'"
      class="text-skin-bg inline-block w-[17px] h-[17px]"
    />
    <IS-play v-else-if="state === 'executed'" class="text-white inline-block w-[17px] h-[17px]" />
    <IS-x-circle
      v-else-if="state === 'rejected'"
      class="text-white inline-block w-[17px] h-[17px]"
    />
    {{ titles[state] }}
  </div>
</template>
