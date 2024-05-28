<script setup lang="ts">
import { _n, _p } from '@/helpers/utils';
import { quorumLabel, quorumProgress, quorumChoiceProgress } from '@/helpers/quorum';
import { Proposal as ProposalType } from '@/types';

const DEFAULT_MAX_CHOICES = 6;

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

const displayAllChoices = ref(false);

const totalProgress = computed(() => quorumProgress(props.proposal));

const results = computed(() => {
  // TODO: sx-api returns number, sx-subgraph returns string
  const parsedTotal = parseFloat(props.proposal.scores_total as unknown as string);

  return props.proposal.scores
    .map((score, i) => {
      const progress = parsedTotal !== 0 ? (score / parsedTotal) * 100 : 0;

      return {
        choice: i + 1,
        progress
      };
    })
    .sort((a, b) => b.progress - a.progress);
});

const hasOneExtra = computed(() => {
  return results.value.length === DEFAULT_MAX_CHOICES + 1;
});

const visibleResults = computed(() => {
  if (displayAllChoices.value || hasOneExtra.value) {
    return results.value;
  }

  return results.value.slice(0, DEFAULT_MAX_CHOICES);
});

const otherResultsSummary = computed(() => {
  const oetherResultsStartIndex = hasOneExtra.value ? DEFAULT_MAX_CHOICES + 1 : DEFAULT_MAX_CHOICES;

  return results.value.slice(oetherResultsStartIndex).reduce(
    (acc, result) => ({
      progress: acc.progress + result.progress,
      count: acc.count + 1
    }),
    {
      progress: 0,
      count: 0
    }
  );
});
</script>

<template>
  <div
    v-if="!!props.proposal.privacy && !props.proposal.completed && withDetails"
    class="text-center py-3.5 leading-5"
  >
    <div
      class="p-1.5 border text-skin-heading rounded-full mb-3 w-[40px] h-[40px] inline-block bg-skin-input-bg"
    >
      <IH-eye-off class="inline-block top-[2px] relative" />
    </div>

    <div class="flex flex-col gap-1">
      <div class="text-skin-heading font-semibold">Shutter privacy enabled</div>
      All votes will be encrypted until the voting period has ended and the final score is
      calculated.
    </div>

    <div class="mt-2.5 text-center">
      <a
        href="https://blog.shutter.network/announcing-shutter-governance-shielded-voting-for-daos/"
        target="_blank"
      >
        <IC-Shutter class="w-[80px] text-skin-text inline-block" />
      </a>

      <div v-if="proposal.quorum" class="mt-3.5">
        {{ quorumLabel(proposal.quorum_type) }}:
        <span class="text-skin-link">{{ _p(totalProgress) }}</span>
      </div>
    </div>
  </div>
  <template v-else>
    <div v-if="withDetails" class="flex flex-col gap-2">
      <div
        v-for="result in visibleResults"
        :key="result.choice"
        class="flex gap-2 border rounded-lg px-3 py-2.5 last:mb-0 text-skin-link relative overflow-hidden items-center"
        :class="{ [`_${result.choice} choice-border`]: proposal.type === 'basic' }"
      >
        <div
          class="absolute bg-skin-border top-0 bottom-0 left-0 pointer-events-none -z-10"
          :class="{ [`_${result.choice} choice-bg opacity-10`]: proposal.type === 'basic' }"
          :style="{
            width: `${result.progress.toFixed(2)}%`
          }"
        />
        <div
          v-if="proposal.type === 'basic'"
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
        <div class="truncate grow" v-text="proposal.choices[result.choice - 1]" />
        <div v-text="_p(result.progress / 100)" />
      </div>
      <button
        v-if="!displayAllChoices && otherResultsSummary.count > 0"
        type="button"
        class="flex gap-2 border rounded-lg px-3 py-2.5 last:mb-0 text-skin-link relative overflow-hidden items-center text-left group"
        @click="displayAllChoices = true"
      >
        <div
          class="absolute bg-skin-border top-0 bottom-0 left-0 pointer-events-none -z-10"
          :style="{
            width: `${otherResultsSummary.progress.toFixed(2)}%`
          }"
        />
        <div class="truncate grow">
          Others
          <span
            class="inline-block bg-skin-border text-skin-link text-[13px] rounded-full px-1.5 ml-2"
            v-text="_n(otherResultsSummary.count, 'compact')"
          />
        </div>
        <div class="group-hover:hidden" v-text="_p(otherResultsSummary.progress / 100)" />
        <div class="hidden group-hover:flex items-center gap-1">
          See all <IH-arrow-down class="w-[16px] h-[16px]" />
        </div>
      </button>
      <div v-if="proposal.quorum">
        {{ quorumLabel(proposal.quorum_type) }}:
        <span class="text-skin-link">{{ _p(totalProgress) }}</span>
      </div>
      <div v-if="proposal.privacy === 'shutter'" class="flex flex-col mt-2.5">
        <div class="text-xs">Powered by</div>
        <div class="flex items-center">
          <a
            href="https://blog.shutter.network/announcing-shutter-governance-shielded-voting-for-daos/"
            target="_blank"
          >
            <IC-Shutter class="w-[80px] text-skin-text" />
          </a>
        </div>
      </div>
    </div>
    <div v-else class="h-full flex items-center">
      <div
        class="rounded-full h-1.5 overflow-hidden"
        :style="{
          width: `${width}px`
        }"
      >
        <div
          v-for="result in results"
          :key="result.choice"
          :title="labels[result.choice - 1]"
          class="choice-bg float-left h-full"
          :style="{
            width: `${quorumChoiceProgress(props.proposal.quorum_type, result, totalProgress).toFixed(3)}%`
          }"
          :class="`_${result.choice}`"
        />
        <div
          title="Quorum left"
          class="choice-bg _quorum float-left h-full"
          :style="{
            width: `${(100 * (1 - totalProgress)).toFixed(3)}%`
          }"
        />
      </div>
    </div>
  </template>
</template>
