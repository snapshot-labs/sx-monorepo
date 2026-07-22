<script setup lang="ts">
import { PRICE_PER_REQUEST } from '@/helpers/keycard';
import { UsageBucket } from '@/helpers/keycard/types';

const PAGE_SIZE = 10;

const props = defineProps<{
  series: UsageBucket[];
}>();

const visibleCount = ref(PAGE_SIZE);

const rows = computed(() =>
  [...props.series].reverse().map(bucket => {
    const hub = bucket.hub * PRICE_PER_REQUEST.hub;
    const score = bucket.score * PRICE_PER_REQUEST.score;
    return {
      ts: bucket.ts,
      label: bucket.label,
      hub,
      score,
      total: hub + score
    };
  })
);

const visibleRows = computed(() => rows.value.slice(0, visibleCount.value));
const hasMore = computed(() => visibleCount.value < rows.value.length);

function showMore() {
  visibleCount.value += PAGE_SIZE;
}

// Reset paging when the series changes (Day <-> Month).
watch(
  () => props.series,
  () => {
    visibleCount.value = PAGE_SIZE;
  }
);
</script>

<template>
  <div>
    <div
      class="flex items-center space-x-3 px-4 py-2.5 text-[13px] uppercase text-skin-text"
    >
      <div class="grow text-left">Period</div>
      <div class="w-[100px] flex justify-end">Hub</div>
      <div class="w-[100px] flex justify-end">Score</div>
      <div class="w-[100px] flex justify-end">Total</div>
    </div>
    <div class="px-4">
      <div
        v-for="row in visibleRows"
        :key="row.ts"
        class="border-b flex space-x-3 py-2.5 items-center"
      >
        <div class="grow text-skin-link truncate" v-text="row.label" />
        <div class="w-[100px] shrink-0 flex justify-end">
          ${{ row.hub.toFixed(2) }}
        </div>
        <div class="w-[100px] shrink-0 flex justify-end">
          ${{ row.score.toFixed(2) }}
        </div>
        <div class="w-[100px] shrink-0 flex justify-end text-skin-heading">
          ${{ row.total.toFixed(2) }}
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
