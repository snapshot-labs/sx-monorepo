<script setup lang="ts">
import { FunctionalComponent } from 'vue';
import ISCheckCircle from '~icons/heroicons-solid/check-circle';
import ISClock from '~icons/heroicons-solid/clock';
import ISCursorClick from '~icons/heroicons-solid/cursor-click';
import ISStatusOnline from '~icons/heroicons-solid/status-online';
import ISXCircle from '~icons/heroicons-solid/x-circle';

export type AuctionState =
  | 'active'
  | 'finalizing'
  | 'claiming'
  | 'claimed'
  | 'canceled';

const STATE_CONFIG: Record<
  AuctionState,
  { label: string; class: string; icon: FunctionalComponent }
> = {
  active: { label: 'Active', class: 'bg-skin-success', icon: ISStatusOnline },
  finalizing: {
    label: 'Finalizing',
    class: 'bg-gray-400',
    icon: ISClock
  },
  claiming: { label: 'Claiming', class: 'bg-[#2b4bd6]', icon: ISCursorClick },
  claimed: {
    label: 'Claimed',
    class: 'bg-skin-link !text-skin-bg',
    icon: ISCheckCircle
  },
  canceled: { label: 'Canceled', class: 'bg-skin-danger', icon: ISXCircle }
};

defineProps<{ state: AuctionState }>();
</script>

<template>
  <div
    :class="STATE_CONFIG[state].class"
    class="inline-flex items-center gap-1 rounded-full pl-2 pr-[10px] py-0.5 text-white mt-3 mb-5"
  >
    <component :is="STATE_CONFIG[state].icon" class="size-[17px]" />
    {{ STATE_CONFIG[state].label }}
  </div>
</template>
