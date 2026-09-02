<script setup lang="ts">
import { formatUsd, PRICE_PER_REQUEST } from '@/helpers/keycard';
import { UsageBucket } from '@/helpers/keycard/types';
import { _n } from '@/helpers/utils';

const PAGE_SIZE = 10;

const props = defineProps<{
  series: UsageBucket[];
}>();

const visibleCount = ref(PAGE_SIZE);

const hasActivity = computed(() =>
  props.series.some(bucket => bucket.hub + bucket.score > 0)
);

const rows = computed(() =>
  [...props.series].reverse().map(bucket => {
    const hub = bucket.hub * PRICE_PER_REQUEST.hub;
    const score = bucket.score * PRICE_PER_REQUEST.score;
    return {
      ts: bucket.ts,
      label: bucket.label,
      hub: { count: bucket.hub, cost: hub },
      score: { count: bucket.score, cost: score },
      total: { count: bucket.hub + bucket.score, cost: hub + score }
    };
  })
);

const visibleRows = computed(() => rows.value.slice(0, visibleCount.value));
const hasMore = computed(() => visibleCount.value < rows.value.length);

function showMore() {
  visibleCount.value += PAGE_SIZE;
}

watch(
  () => props.series,
  () => {
    visibleCount.value = PAGE_SIZE;
  }
);
</script>

<template>
  <div>
    <UiColumnHeader :sticky="false" class="space-x-3">
      <div class="grow text-left">Period</div>
      <div class="hidden sm:flex w-[100px] justify-end">Hub</div>
      <div class="hidden sm:flex w-[100px] justify-end">Score</div>
      <div class="w-[100px] flex justify-end">Total</div>
    </UiColumnHeader>
    <UiStateWarning v-if="!hasActivity" class="px-4 py-3">
      No requests in this period yet.
    </UiStateWarning>
    <div v-else class="px-4">
      <div
        v-for="row in visibleRows"
        :key="row.ts"
        class="border-b flex space-x-3 py-2.5 items-center"
      >
        <div class="grow text-skin-link truncate" v-text="row.label" />
        <div
          class="hidden sm:flex w-[100px] shrink-0 flex-col items-end leading-tight"
        >
          <span v-text="_n(row.hub.count)" />
          <span class="text-[13px]" v-text="formatUsd(row.hub.cost)" />
        </div>
        <div
          class="hidden sm:flex w-[100px] shrink-0 flex-col items-end leading-tight"
        >
          <span v-text="_n(row.score.count)" />
          <span class="text-[13px]" v-text="formatUsd(row.score.cost)" />
        </div>
        <div
          class="w-[100px] shrink-0 flex flex-col items-end leading-tight text-skin-heading"
        >
          <span v-text="_n(row.total.count)" />
          <span
            class="text-[13px] text-skin-text"
            v-text="formatUsd(row.total.cost)"
          />
        </div>
      </div>
      <button
        v-if="hasMore"
        type="button"
        class="w-full py-3 text-sm text-skin-link hover:text-skin-heading"
        @click="showMore"
      >
        Show more
      </button>
    </div>
  </div>
</template>
