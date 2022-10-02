<script setup lang="ts">
import { Proposal as ProposalType } from '@/types';

withDefaults(
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
        v-if="proposal.scores_total === 0"
        title="No votes"
        class="choice-bg _3 float-left w-full h-full"
      />
      <div
        v-for="(score, i) in Array(3)"
        :key="i"
        :title="labels[i]"
        class="choice-bg float-left h-full"
        :style="{
          width: `${(
            (100 / proposal.scores_total) *
            proposal[`scores_${i + 1}`]
          ).toFixed(3)}%`
        }"
        :class="`_${i + 1}`"
      />
    </div>
  </div>
</template>
