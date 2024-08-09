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
  id: string;
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

const { getTsFromCurrent, getDurationFromCurrentEVM } = useMetaStore();

const now = ref(parseInt((Date.now() / 1000).toFixed()));

onMounted(() => {
  const interval = setInterval(() => {
    now.value = parseInt((Date.now() / 1000).toFixed());
  }, 1000);

  onUnmounted(() => {
    clearInterval(interval);
  });
});

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
  const start =
    now.value + getDurationFromCurrentEVM(network, data.voting_delay);
  return {
    start,
    min_end: start + getDurationFromCurrentEVM(network, data.min_voting_period),
    max_end: start + getDurationFromCurrentEVM(network, data.max_voting_period)
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
