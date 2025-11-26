<script setup lang="ts">
import ISCheckCircle from '~icons/heroicons-solid/check-circle';
import ISCursorClick from '~icons/heroicons-solid/cursor-click';
import ISStatusOnline from '~icons/heroicons-solid/status-online';
import ISXCircle from '~icons/heroicons-solid/x-circle';

export type AuctionState = 'active' | 'claiming' | 'claimed' | 'canceled';

const STATE_CONFIG: Record<
  AuctionState,
  { label: string; classes: string; icon: typeof ISStatusOnline }
> = {
  active: { label: 'Active', classes: 'bg-skin-success', icon: ISStatusOnline },
  claiming: { label: 'Claiming', classes: 'bg-[#2b4bd6]', icon: ISCursorClick },
  claimed: {
    label: 'Claimed',
    classes: 'bg-skin-link !text-skin-bg',
    icon: ISCheckCircle
  },
  canceled: { label: 'Canceled', classes: 'bg-skin-danger', icon: ISXCircle }
};

defineProps<{ state: AuctionState }>();
</script>

<template>
  <div
    :class="STATE_CONFIG[state].classes"
    class="inline-flex items-center gap-1 rounded-full pl-2 pr-[10px] py-0.5 text-white mt-3 mb-5"
  >
    <component :is="STATE_CONFIG[state].icon" class="size-[17px]" />
    {{ STATE_CONFIG[state].label }}
  </div>
</template>
