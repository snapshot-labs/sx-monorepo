<script setup lang="ts">
import { ProposalState } from '@/types';

const titles: Record<ProposalState, string> = {
  pending: 'Pending',
  active: 'Active',
  passed: 'Passed',
  closed: 'Closed',
  rejected: 'Rejected',
  queued: 'Queued',
  vetoed: 'Vetoed',
  executed: 'Executed'
};

defineProps<{ state: ProposalState }>();
</script>

<template>
  <div
    :class="{
      'bg-gray-400': state === 'pending' || state === 'queued',
      'bg-skin-success': state === 'active',
      'bg-skin-link': ['passed', 'closed'].includes(state),
      'bg-purple-500': state === 'executed',
      'bg-skin-danger': ['rejected', 'vetoed'].includes(state),
      '!text-skin-bg': ['passed', 'closed'].includes(state)
    }"
    class="inline-block rounded-full pl-2 pr-[10px] pb-0.5 text-white mb-2"
  >
    <IS-clock
      v-if="state === 'pending'"
      class="text-white inline-block size-[17px] mb-[1px]"
    />
    <IS-status-online
      v-else-if="state === 'active'"
      class="text-white inline-block size-[17px] mb-[1px]"
    />
    <IS-check-circle
      v-else-if="state === 'passed'"
      class="text-skin-bg inline-block size-[17px] mb-[1px]"
    />
    <IS-minus-circle
      v-else-if="state === 'closed'"
      class="text-skin-bg inline-block size-[17px] mb-[1px]"
    />
    <IS-play
      v-else-if="state === 'queued'"
      class="text-white inline-block size-[17px]"
    />
    <IS-play
      v-else-if="state === 'executed'"
      class="text-white inline-block size-[17px]"
    />
    <IS-x-circle
      v-else-if="['rejected', 'vetoed'].includes(state)"
      class="text-white inline-block size-[17px] mb-[1px]"
    />
    {{ titles[state] }}
  </div>
</template>
