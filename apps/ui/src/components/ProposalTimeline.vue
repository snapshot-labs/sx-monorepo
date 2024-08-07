<script setup lang="ts">
import { _t } from '@/helpers/utils';
import { NetworkID, Proposal, Space } from '@/types';

type ProposalTimelineValues = {
  network: NetworkID;
  created?: number;
  start: number;
  min_end: number;
  max_end: number;
};

type State = {
  id: string;
  block_number?: number;
  value: number;
};

const props = defineProps<{ data: Proposal | Space }>();

const labels = {
  created: 'Created',
  start: 'Start',
  end: 'End',
  min_end: 'Min. end',
  max_end: 'Max. end'
};

const { getTsFromCurrent } = useMetaStore();

const now = ref(parseInt((Date.now() / 1e3).toFixed()));

onMounted(() => {
  const interval = setInterval(() => {
    now.value = parseInt((Date.now() / 1e3).toFixed());
  }, 1e3);

  onUnmounted(() => {
    clearInterval(interval);
  });
});

const formatTimelineValues = (): ProposalTimelineValues => {
  const data = props.data;
  if ('start' in data) {
    const { network, created, start, min_end, max_end } = data;
    return { network, created, start, min_end, max_end };
  }
  const start = now.value + (data?.voting_delay || 0);
  return {
    network: data.network,
    start,
    min_end: start + (data?.min_voting_period || 0),
    max_end: start + (data?.max_voting_period || 0)
  };
};

const states: ComputedRef<State[]> = computed(() => {
  const { network, created, start, min_end, max_end } = formatTimelineValues();
  let initial: State[] = [];

  if (created) {
    initial.push({
      id: 'created',
      value: created
    });
  }
  initial.push({
    id: 'start',
    block_number: start,
    value: getTsFromCurrent(network, start)
  });
  if (min_end === max_end) {
    initial.push({
      id: 'end',
      block_number: min_end,
      value: getTsFromCurrent(network, min_end)
    });
  } else {
    initial = initial.concat([
      {
        id: 'min_end',
        block_number: min_end,
        value: getTsFromCurrent(network, min_end)
      },
      {
        id: 'max_end',
        block_number: max_end,
        value: getTsFromCurrent(network, max_end)
      }
    ]);
  }
  return initial;
});
</script>

<template>
  <div class="flex">
    <div class="mt-1 ml-2">
      <div
        v-for="(state, i) in states"
        :key="state.id"
        class="flex relative h-[60px]"
      >
        <div
          class="absolute size-[15px] inline-block rounded-full left-[-7px] border-4 border-skin-bg"
          :class="state.value <= now ? 'bg-skin-heading' : 'bg-skin-border'"
        />
        <div
          v-if="states[i + 1]"
          class="border-l pr-4 mt-3"
          :class="states[i + 1].value <= now && 'border-skin-heading'"
        />
      </div>
    </div>
    <div class="flex-auto leading-6">
      <div
        v-for="state in states"
        :key="state.id"
        class="mb-3 last:mb-0 h-[44px]"
      >
        <h4 v-text="labels[state.id]" />
        {{ _t(state.value) }}
      </div>
    </div>
  </div>
</template>
