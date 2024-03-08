<script setup lang="ts">
import { _n, _p } from '@/helpers/utils';
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

const progress = computed(() => Math.min(props.proposal.scores_total / props.proposal.quorum, 1));

const adjustedScores = computed(() =>
  [props.proposal.scores[0], props.proposal.scores[1], props.proposal.scores[2]].map(score => {
    // TODO: sx-api returns number, sx-subgraph returns string
    const parsedTotal = parseFloat(props.proposal.scores_total as unknown as string);

    return parsedTotal !== 0 ? (score / parsedTotal) * 100 * progress.value : 0;
  })
);

const results = computed(() =>
  adjustedScores.value
    .map((score, i) => ({
      choice: i + 1,
      score: props.proposal.scores[i],
      progress: score
    }))
    .sort((a, b) => b.progress - a.progress)
);

const shutterActive = computed(
  () =>
    props.proposal.privacy === 'shutter' && !['passed', 'rejected'].includes(props.proposal.state)
);
</script>

<template>
  <div v-if="proposal.type !== 'basic'" class="flex flex-col gap-2">
    <div
      v-for="(choice, id) in proposal.choices"
      :key="id"
      class="flex justify-between border rounded-lg p-3 last:mb-0 text-skin-link relative overflow-hidden"
    >
      <div class="truncate mr-2 z-10">{{ choice }}</div>
      <div class="z-10">
        <span v-if="shutterActive">
          <UiTooltip
            class="cursor-help"
            title="This proposal has Shutter privacy enabled. All votes will be encrypted until the voting period has ended and the final score is calculated"
          >
            <i-h-lock-closed />
          </UiTooltip>
        </span>
        <span v-else>{{ _p(proposal.scores[id] / (proposal.scores_total || Infinity)) }}</span>
      </div>
      <div
        class="absolute bg-skin-border top-0 bottom-0 left-0 pointer-events-none"
        :style="{
          width: `${((proposal.scores[id] / (proposal.scores_total || Infinity)) * 100).toFixed(
            2
          )}%`
        }"
      />
    </div>
  </div>
  <div
    v-else
    :class="{
      'flex items-center': !withDetails
    }"
  >
    <div v-if="withDetails" class="text-skin-link mb-3">
      <div v-for="result in results" :key="result.choice" class="flex items-center space-x-2 mb-1">
        <div
          class="rounded-full choice-bg inline-block w-[18px] h-[18px]"
          :class="`_${result.choice}`"
        >
          <IH-check v-if="result.choice === 1" class="text-white w-[14px] h-[14px] mt-0.5 ml-0.5" />
          <IH-x
            v-else-if="result.choice === 2"
            class="text-white w-[14px] h-[14px] mt-0.5 ml-0.5"
          />
          <IH-minus-sm
            v-else-if="result.choice === 3"
            class="text-white w-[14px] h-[14px] mt-0.5 ml-0.5"
          />
        </div>

        <UiTooltip
          v-if="shutterActive"
          class="cursor-help"
          title="This proposal has Shutter privacy enabled. All votes will be encrypted until the voting period has ended and the final score is calculated"
        >
          <div class="flex items-center gap-1">
            <i-h-lock-closed />
            <span>Encrypted</span>
          </div>
        </UiTooltip>
        <template v-else>
          <span
            v-text="
              `${_n(Number(result.score) / 10 ** decimals, 'compact')} ${
                proposal.space.voting_power_symbol
              }`
            "
          />
          <span
            class="text-skin-text"
            v-text="`${_n(result.progress, 'compact', { maximumFractionDigits: 1 })}%`"
          />
        </template>
      </div>
    </div>
    <div
      v-if="!shutterActive"
      class="rounded-full h-1.5 overflow-hidden"
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
  <div v-if="proposal.privacy === 'shutter'" class="flex flex-col mt-2">
    <div class="text-xs">Powered by</div>
    <div class="flex items-center">
      <UiTooltip
        title="This proposal has Shutter privacy enabled. All votes will be encrypted until the voting period has ended and the final score is calculated"
      >
        <a
          href="https://blog.shutter.network/announcing-shutter-governance-shielded-voting-for-daos/"
        >
          <IC-Shutter class="w-[80px]" />
        </a>
      </UiTooltip>
    </div>
  </div>
</template>
