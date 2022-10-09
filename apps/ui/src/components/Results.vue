<script setup lang="ts">
import { computed } from 'vue';
import { Proposal as ProposalType } from '@/types';

const props = withDefaults(
  defineProps<{
    proposal: ProposalType;
    width?: number | 'full';
  }>(),
  {
    width: 100
  }
);

const labels = {
  0: 'For',
  1: 'Against',
  2: 'Abstain'
};

const progress = computed(() =>
  Math.min(props.proposal.scores_total / props.proposal.space.quorum, 1)
);
</script>

<template>
  <div class="flex items-center h-full">
    <div
      class="rounded-full h-[6px] overflow-hidden"
      :style="{
        width: width === 'full' ? '100%' : `${width}px`
      }"
    >
      <div
        v-for="(score, i) in Array(3)"
        :key="i"
        :title="labels[i]"
        class="choice-bg float-left h-full"
        :style="{
          width: `${(
            (100 / proposal.scores_total) *
            proposal[`scores_${i + 1}`] *
            progress
          ).toFixed(3)}%`
        }"
        :class="`_${i + 1}`"
      />
      <div
        title="Quorum left"
        class="choice-bg _quorum float-left h-full"
        :style="{
          width: `${(100 * (1 - progress)).toFixed(3)}%`
        }"
      />
    </div>
  </div>
</template>
