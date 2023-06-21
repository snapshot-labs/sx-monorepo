<script setup lang="ts">
import { _n } from '@/helpers/utils';
import { Proposal as ProposalType } from '@/types';

const props = withDefaults(
  defineProps<{
    proposal: ProposalType;
    decimals?: number;
    withDetails?: boolean;
    width?: number;
  }>(),
  {
    decimals: 0,
    withDetails: false,
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
  <div
    class="h-full"
    :class="{
      'flex items-center': !withDetails
    }"
  >
    <div
      v-if="withDetails"
      class="inline-block text-skin-link mb-2 cursor-pointer hover:opacity-80 space-y-1"
      @click="showAlternatives = !showAlternatives"
    >
      <div
        v-for="result in visibleResults"
        :key="result.choice"
        class="flex items-center space-x-2"
      >
        <div
          class="rounded-full choice-bg inline-block w-[18px] h-[18px]"
          :class="`_${result.choice}`"
        >
          <IH-check
            v-if="result.choice === 1"
            class="text-white w-[14px] h-[14px] mt-[2px] ml-[2px]"
          />
          <IH-x
            v-else-if="result.choice === 2"
            class="text-white w-[14px] h-[14px] mt-[2px] ml-[2px]"
          />
          <IH-arrow-sm-right
            v-else-if="result.choice === 3"
            class="text-white w-[14px] h-[14px] mt-[2px] ml-[2px]"
          />
        </div>
        <span
          v-text="
            `${_n(Number(result.score) / 10 ** decimals)} ${proposal.space.voting_power_symbol}`
          "
        />
        <span class="text-skin-text" v-text="`${_n(result.progress)}%`" />
      </div>
    </div>
    <div
      class="rounded-full h-[6px] overflow-hidden"
      :style="{
        width: withDetails ? '100%' : `${width}px`
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
