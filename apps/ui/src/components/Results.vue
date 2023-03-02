<script setup lang="ts">
import { ref, computed } from 'vue';
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

const showAlternatives = ref(false);

const progress = computed(() => Math.min(props.proposal.scores_total / props.proposal.quorum, 1));

const adjustedScores = computed(() =>
  [props.proposal.scores_1, props.proposal.scores_2, props.proposal.scores_3].map(score => {
    // TODO: sx-api returns number, sx-subgraph returns string
    const parsedTotal = parseFloat(props.proposal.scores_total as unknown as string);

    return parsedTotal !== 0 ? (score / parsedTotal) * 100 * progress.value : 0;
  })
);

const results = computed(() =>
  adjustedScores.value
    .map((score, i) => ({
      choice: i + 1,
      score: props.proposal[`scores_${i + 1}`],
      progress: score
    }))
    .sort((a, b) => b.progress - a.progress)
);
const visibleResults = computed(() =>
  showAlternatives.value ? results.value : results.value.slice(0, 1)
);
</script>

<template>
  <div class="h-full">
    <div
      v-if="width === 'full'"
      class="inline-block text-skin-link mb-2 cursor-pointer hover:opacity-80"
      @click="showAlternatives = !showAlternatives"
    >
      <div v-for="result in visibleResults" :key="result.choice" class="inline-block mr-4">
        <span class="choice-text" :class="`_${result.choice}`">
          {{ result.progress.toFixed(0) }}%
        </span>
        <IH-lightning-bolt class="inline-block ml-1" />
        {{ result.score }}
      </div>
    </div>
    <div
      class="rounded-full h-[6px] overflow-hidden"
      :style="{
        width: width === 'full' ? '100%' : `${width}px`
      }"
    >
      <div
        v-for="result in results"
        :key="result.choice"
        :title="labels[result.choice - 1]"
        class="choice-bg float-left h-full"
        :style="{
          width: `${result.progress.toFixed(3)}%`
        }"
        :class="`_${result.choice}`"
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
