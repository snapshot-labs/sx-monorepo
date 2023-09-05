<script setup lang="ts">
import { _t } from '@/helpers/utils';
import { Proposal } from '@/types';

const props = defineProps<{
  open: boolean;
  proposal: Proposal;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const labels = {
  created: 'Created',
  start: 'Start',
  end: 'End',
  min_end: 'Min. end',
  max_end: 'Max. end'
};

const { getTsFromBlock } = useMetaStore();

const states = computed(() => {
  const network = props.proposal.network;

  if (props.proposal.min_end === props.proposal.max_end) {
    return [
      {
        id: 'created',
        value: props.proposal.created
      },
      {
        id: 'start',
        block_number: props.proposal.start,
        value: getTsFromBlock(network, props.proposal.start)
      },
      {
        id: 'end',
        block_number: props.proposal.min_end,
        value: getTsFromBlock(network, props.proposal.min_end)
      }
    ];
  }

  return [
    {
      id: 'created',
      value: props.proposal.created
    },
    {
      id: 'start',
      block_number: props.proposal.start,
      value: getTsFromBlock(network, props.proposal.start)
    },
    {
      id: 'min_end',
      block_number: props.proposal.min_end,
      value: getTsFromBlock(network, props.proposal.min_end)
    },
    {
      id: 'max_end',
      block_number: props.proposal.max_end,
      value: getTsFromBlock(network, props.proposal.max_end)
    }
  ];
});

const now = parseInt((Date.now() / 1e3).toFixed());
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Timeline'" />
    </template>
    <div class="p-4 flex flex-column">
      <div class="mt-1 ml-2">
        <div v-for="(state, i) in states" :key="state.id" class="flex relative h-[60px]">
          <div
            class="absolute w-[15px] h-[15px] inline-block rounded-full -left-[7px] border-[4px] border-skin-bg"
            :class="state.value <= now ? 'bg-skin-heading' : 'bg-gray-600'"
          />
          <div
            v-if="states[i + 1]"
            class="border-l pr-4 mt-3"
            :class="states[i + 1].value <= now && 'border-skin-heading'"
          />
        </div>
      </div>
      <div class="flex-auto leading-6">
        <div v-for="state in states" :key="state.id" class="mb-3 last:mb-0 h-[44px]">
          <h4 v-text="labels[state.id]" />
          {{ _t(state.value) }}
        </div>
      </div>
    </div>
  </UiModal>
</template>
