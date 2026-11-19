<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import {
  getChoiceColors,
  getVisibleChoicesCount,
  OTHERS_COLOR
} from '@/helpers/choices';
import {
  formatQuorum,
  getProposalCurrentQuorum,
  quorumChoiceProgress,
  quorumLabel,
  quorumProgress
} from '@/helpers/quorum';
import { _n, _p, _vp } from '@/helpers/utils';
import { getNetwork, offchainNetworks } from '@/networks';
import { PROPOSALS_KEYS } from '@/queries/proposals';
import { Proposal as ProposalType } from '@/types';

const SHUTTER_URL = 'https://www.shutter.network/shielded-voting';

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

const queryClient = useQueryClient();

const displayAllChoices = ref(false);

const totalProgress = computed(() => quorumProgress(props.proposal));

const colors = computed(() => getChoiceColors(props.proposal));

const quorumAmount = computed(() => {
  const current = getProposalCurrentQuorum(
    props.proposal.network,
    props.proposal
  );
  const format = (n: number) => _vp(n / 10 ** props.decimals);
  return `${format(current)} / ${format(props.proposal.quorum)}`;
});

const placeholderResults = computed(() =>
  props.proposal.choices.map((_, i) => ({
    choice: i + 1,
    progress: 0,
    score: 0
  }))
);

const results = computed(() => {
  if (!props.proposal.scores.length) return placeholderResults.value;

  // TODO: sx-api returns number, sx-subgraph returns string
  const parsedTotal = parseFloat(
    props.proposal.scores_total as unknown as string
  );

  return props.proposal.scores
    .map((score, i) => {
      const progress = parsedTotal !== 0 ? (score / parsedTotal) * 100 : 0;

      return {
        choice: i + 1,
        progress,
        score
      };
    })
    .sort((a, b) => b.progress - a.progress);
});

const visibleCount = computed(() =>
  getVisibleChoicesCount(results.value.length)
);

const visibleResults = computed(() => {
  if (displayAllChoices.value) return results.value;

  return results.value.slice(0, visibleCount.value);
});

const otherResultsSummary = computed(() => {
  return results.value.slice(visibleCount.value).reduce(
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

// Segments of the small results bar: leading choices, others, quorum left
const barSegments = computed(() => {
  const { choices, quorum_type } = props.proposal;
  const others = { choice: 0, progress: otherResultsSummary.value.progress };
  // Approval scores add up to more or less than the total: the bar shows the
  // share of each choice, so that it is always full
  const total = results.value.reduce((sum, { progress }) => sum + progress, 0);
  const scale = total ? 100 / total : 0;
  const getWidth = (result: { choice: number; progress: number }) =>
    quorumChoiceProgress(quorum_type, result, totalProgress.value) * scale;

  return [
    ...visibleResults.value.map(result => ({
      label: `${choices[result.choice - 1]} ${_p(result.progress / 100)}`,
      width: getWidth(result),
      color: colors.value[result.choice - 1] ?? OTHERS_COLOR
    })),
    {
      label: `Others ${_p(others.progress / 100)}`,
      width: getWidth(others),
      color: OTHERS_COLOR
    },
    {
      label: 'Quorum left',
      width: 100 * (1 - totalProgress.value),
      color: 'rgb(var(--border))'
    }
  ].filter(segment => segment.width > 0);
});

const isFinalizing = computed(() => {
  return (
    offchainNetworks.includes(props.proposal.network) &&
    !props.proposal.completed &&
    ['passed', 'executed', 'rejected', 'closed'].includes(props.proposal.state)
  );
});

async function refreshScores() {
  try {
    const network = getNetwork(props.proposal.network);
    const hubUrl = network.api.apiUrl.replace('/graphql', '');
    const response = await fetch(`${hubUrl}/api/scores/${props.proposal.id}`);
    const result = await response.json();

    if (result.result === true) {
      queryClient.invalidateQueries({
        queryKey: PROPOSALS_KEYS.space(
          props.proposal.network,
          props.proposal.space.id
        )
      });
    }
  } catch (err) {
    console.warn('Failed to refresh scores', err);
  }
}

onMounted(() => {
  if (isFinalizing.value) refreshScores();
});
</script>

<template>
  <div v-if="isFinalizing && withDetails" class="border rounded-lg px-3 py-2.5">
    <div class="flex items-center gap-2 text-skin-link">
      <IH-exclamation-circle class="shrink-0" />
      Finalizing results
    </div>
    Please allow few minutes while final results are being calculated.
  </div>
  <div
    v-else-if="
      props.proposal.privacy !== 'none' &&
      (props.proposal.state === 'active' ||
        (props.proposal.privacy === 'inco' && !props.proposal.completed)) &&
      withDetails
    "
    class="space-y-1"
  >
    <div v-if="props.proposal.privacy === 'inco'">
      Votes are encrypted and never revealed. The results will be decrypted
      after the voting period is over.
    </div>
    <div v-else>
      All votes are encrypted and will be decrypted only after the voting period
      is over, making the results visible.
    </div>
    <div v-if="proposal.quorum" class="flex items-center justify-between">
      <span class="text-skin-link">
        {{ quorumLabel(proposal.quorum_type) }}
      </span>
      <div class="flex items-center gap-2">
        <span>{{ quorumAmount }}</span>
        <span class="text-skin-heading">{{ formatQuorum(totalProgress) }}</span>
      </div>
    </div>
  </div>
  <template v-else>
    <div v-if="withDetails" class="flex flex-col gap-2">
      <div
        v-for="result in visibleResults"
        :key="result.choice"
        class="flex gap-2 border rounded-lg px-3 py-2.5 last:mb-0 text-skin-link relative overflow-hidden items-center"
        :style="{ borderColor: colors[result.choice - 1] }"
      >
        <div
          class="absolute inset-y-0 left-0 pointer-events-none -z-10"
          :class="colors[result.choice - 1] ? 'opacity-20' : 'bg-skin-border'"
          :style="{
            width: `${result.progress.toFixed(2)}%`,
            backgroundColor: colors[result.choice - 1]
          }"
        />
        <div
          v-if="proposal.type === 'basic'"
          class="rounded-full choice-bg inline-block size-[18px]"
          :class="`_${result.choice}`"
        >
          <IH-check
            v-if="result.choice === 1"
            class="text-white size-[14px] mt-0.5 ml-0.5"
          />
          <IH-x
            v-else-if="result.choice === 2"
            class="text-white size-[14px] mt-0.5 ml-0.5"
          />
          <IH-minus-sm
            v-else-if="result.choice === 3"
            class="text-white size-[14px] mt-0.5 ml-0.5"
          />
        </div>
        <UiTooltipOnTruncate
          :content="proposal.choices[result.choice - 1]"
          class="grow"
        />
        <IH-lock-closed
          v-if="proposal.privacy !== 'none' && !proposal.completed"
          class="size-[16px] shrink-0"
        />
        <template v-else>
          <div>
            {{ _vp(result.score / 10 ** decimals) }}
          </div>
          <div v-text="_p(result.progress / 100)" />
        </template>
      </div>
      <button
        v-if="!displayAllChoices && otherResultsSummary.count > 0"
        type="button"
        class="flex gap-2 border rounded-lg px-3 py-2.5 last:mb-0 text-skin-link relative overflow-hidden items-center text-left group"
        @click="displayAllChoices = true"
      >
        <div
          class="absolute bg-skin-border inset-y-0 left-0 pointer-events-none -z-10"
          :style="{
            width: `${otherResultsSummary.progress.toFixed(2)}%`
          }"
        />
        <div class="truncate grow flex items-center gap-2">
          Others
          <UiPill :label="_n(otherResultsSummary.count, 'compact')" />
        </div>
        <div
          class="group-hover:hidden"
          v-text="_p(otherResultsSummary.progress / 100)"
        />
        <div class="hidden group-hover:flex items-center gap-1">
          See all <IH-arrow-down class="size-[16px]" />
        </div>
      </button>
      <div v-if="proposal.quorum" class="flex items-center justify-between">
        <span class="text-skin-link">
          {{ quorumLabel(proposal.quorum_type) }}
        </span>
        <div class="flex items-center gap-2">
          <span>{{ quorumAmount }}</span>
          <span class="text-skin-heading">
            {{ formatQuorum(totalProgress) }}
          </span>
        </div>
      </div>
    </div>
    <div
      v-else-if="props.proposal.privacy === 'none' || props.proposal.completed"
      class="h-full flex items-center"
    >
      <div
        class="rounded-full h-[6px] overflow-hidden"
        :style="{
          width: `${width}px`
        }"
      >
        <div
          v-for="(segment, i) in barSegments"
          :key="i"
          v-tippy="{ content: segment.label }"
          class="float-left h-full"
          :style="{
            width: `${segment.width.toFixed(3)}%`,
            backgroundColor: segment.color
          }"
        />
      </div>
    </div>
  </template>
  <AppLink
    v-if="proposal.privacy == 'shutter' && withDetails"
    :to="SHUTTER_URL"
    class="flex items-center text-skin-link mt-2.5"
  >
    <IC-Shutter class="w-[80px]" />
    <IH-arrow-sm-right class="-rotate-45" />
  </AppLink>
</template>
