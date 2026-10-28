<script setup lang="ts">
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
  [...props.series]
    .reverse()
    .map(bucket => ({ ...bucket, total: bucket.hub + bucket.score }))
);

const visibleRows = computed(() => rows.value.slice(0, visibleCount.value));
const hasMore = computed(() => visibleCount.value < rows.value.length);

function showMore() {
  visibleCount.value += PAGE_SIZE;
}

watch(
  () => props.series[0]?.ts,
  () => {
    visibleCount.value = PAGE_SIZE;
  }
);
</script>

<template>
  <div>
    <UiColumnHeader :sticky="false" class="space-x-3">
      <div class="grow text-left">Period</div>
      <div class="hidden sm:flex w-[120px] justify-end">Hub API</div>
      <div class="hidden sm:flex w-[120px] justify-end">Score API</div>
      <div class="w-[120px] flex justify-end">Total</div>
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
          class="hidden sm:flex w-[120px] shrink-0 justify-end"
          v-text="`${_n(row.hub)} req`"
        />
        <div
          class="hidden sm:flex w-[120px] shrink-0 justify-end"
          v-text="`${_n(row.score)} req`"
        />
        <div
          class="w-[120px] shrink-0 flex justify-end text-skin-heading"
          v-text="`${_n(row.total)} req`"
        />
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
