<script setup lang="ts">
import { _t } from '@/helpers/utils';
import { Proposal, Space } from '@/types';

type ProposalTimelineValues = {
  created?: number;
  start: number;
  min_end: number;
  max_end: number;
};

type State = {
  id: keyof typeof LABELS;
  value: number;
};

const props = defineProps<{ data: Proposal | Space }>();

const LABELS = {
  created: 'Created',
  start: 'Start',
  end: 'End',
  min_end: 'Min. end',
  max_end: 'Max. end'
};

const { getTsFromCurrent, getDurationFromCurrent } = useMetaStore();

const timestamp = useTimestamp({ interval: 1000 });

const now = computed(() => Math.floor(timestamp.value / 1000));

function formatTimelineValues(): ProposalTimelineValues {
  const data = props.data;
  if ('start' in data) {
    const { network, created, start, min_end, max_end } = data;
    return {
      created,
      start: getTsFromCurrent(network, start),
      min_end: getTsFromCurrent(network, min_end),
      max_end: getTsFromCurrent(network, max_end)
    };
  }
  const network = data.network;
  const start = now.value + getDurationFromCurrent(network, data.voting_delay);
  return {
    start,
    min_end: start + getDurationFromCurrent(network, data.min_voting_period),
    max_end: start + getDurationFromCurrent(network, data.max_voting_period)
  };
}

const states: ComputedRef<State[]> = computed(() => {
  const { created, start, min_end, max_end } = formatTimelineValues();
  const initial: State[] = [];

  if (created) {
    initial.push({
      id: 'created',
      value: created
    });
  }

  initial.push({
    id: 'start',
    value: start
  });

  if (min_end === max_end) {
    initial.push({
      id: 'end',
      value: min_end
    });
  } else {
    initial.push(
      {
        id: 'min_end',
        value: min_end
      },
      {
        id: 'max_end',
        value: max_end
      }
    );
  }

  return initial;
});

// Use an offset to compare timestamps to avoid issues when comparing
// timestamps that are not refreshed synchronously
function isInThePast(timestamp: number): boolean {
  return timestamp <= now.value + 1;
}
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
          :class="
            isInThePast(state.value) ? 'bg-skin-heading' : 'bg-skin-border'
          "
        />
        <div
          v-if="states[i + 1]"
          class="border-l pr-4 mt-3"
          :class="isInThePast(states[i + 1].value) && 'border-skin-heading'"
        />
      </div>
    </div>
    <div class="flex-auto leading-6">
      <div
        v-for="state in states"
        :key="state.id"
        class="mb-3 last:mb-0 h-[44px]"
      >
        <h4 v-text="LABELS[state.id]" />
        <div class="flex gap-2 items-center">
          <div v-text="_t(state.value)" />
          <slot :name="`${state.id}-date-suffix`" />
        </div>
      </div>
    </div>
  </div>
</template>
