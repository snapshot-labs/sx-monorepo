<script setup lang="ts">
import UiColumnHeader from '@/components/Ui/ColumnHeader.vue';
import { _n, _t, _vp, shortenAddress } from '@/helpers/utils';
import { getNetwork, offchainNetworks } from '@/networks';
import { useProposalScoresTicksQuery } from '@/queries/proposals';
import { useProposalVotesQuery } from '@/queries/votes';
import { Proposal as ProposalType, Vote } from '@/types';

const props = defineProps<{
  proposal: ProposalType;
}>();

const sortBy = ref(
  'vp-desc' as 'vp-desc' | 'vp-asc' | 'created-desc' | 'created-asc'
);
const choiceFilter = ref('any' as 'any' | 'for' | 'against' | 'abstain');
const modalOpen = ref(false);
const selectedVote = ref<Vote | null>(null);

const votesHeader = ref<HTMLElement | null>(null);
const { x: votesHeaderX } = useScroll(votesHeader);

const network = computed(() => getNetwork(props.proposal.network));
const votingPowerDecimals = computed(() => props.proposal.vp_decimals);

const { data: scoresTicks, isPending: isScoresTicksPending } =
  useProposalScoresTicksQuery(toRef(() => props.proposal));

const {
  data,
  fetchNextPage,
  hasNextPage,
  isPending,
  isError,
  isFetchingNextPage
} = useProposalVotesQuery({
  proposal: toRef(props, 'proposal'),
  choiceFilter,
  sortBy
});

function handleSortChange(type: 'vp' | 'created') {
  if (sortBy.value.startsWith(type)) {
    sortBy.value = sortBy.value.endsWith('desc')
      ? `${type}-asc`
      : `${type}-desc`;
  } else {
    sortBy.value = `${type}-desc`;
  }
}

async function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}

function handleChoiceClick(vote: Vote | null) {
  if (!vote?.reason) return;

  selectedVote.value = vote;
  modalOpen.value = true;
}

function handleScrollEvent(target: HTMLElement) {
  votesHeaderX.value = target.scrollLeft;
}
</script>

<template>
  <div v-if="proposal.type === 'basic' && proposal.vote_count > 0">
    <ProposalScoresChart
      v-if="scoresTicks && scoresTicks.length > 0"
      :ticks="scoresTicks"
      :choices="proposal.choices"
      :decimals="proposal.vp_decimals"
      :start="proposal.start"
      :end="proposal.max_end"
      :quorum="proposal.quorum"
      class="border-b pb-3"
    />
    <div
      v-else-if="isScoresTicksPending"
      class="flex items-center justify-center border-b pb-3"
      style="height: 236px"
    >
      <UiLoading />
    </div>
  </div>
  <UiColumnHeader
    :ref="
      ref =>
        (votesHeader =
          (ref as InstanceType<typeof UiColumnHeader> | null)?.container ??
          null)
    "
    class="!px-0 overflow-hidden"
  >
    <div class="flex space-x-3 min-w-[735px] w-full">
      <div class="ml-4 max-w-[218px] w-[218px] truncate">Voter</div>
      <div class="grow w-[40%]">
        <template v-if="offchainNetworks.includes(proposal.network)"
          >Choice</template
        >
        <UiSelectDropdown
          v-else
          v-model="choiceFilter"
          class="font-normal text-center"
          title="Choice"
          gap="12"
          placement="start"
          :items="[
            { key: 'any', label: 'Any' },
            { key: 'for', label: 'For', indicator: 'bg-skin-success' },
            {
              key: 'against',
              label: 'Against',
              indicator: 'bg-skin-danger'
            },
            { key: 'abstain', label: 'Abstain', indicator: 'bg-skin-text' }
          ]"
        >
          <template #button>
            <button
              class="flex items-center hover:text-skin-link space-x-2"
              type="button"
            >
              <span class="truncate">Choice</span>
              <IH-adjustments-vertical class="shrink-0" />
            </button>
          </template>
        </UiSelectDropdown>
      </div>
      <button
        type="button"
        class="flex max-w-[144px] w-[144px] items-center hover:text-skin-link space-x-1 truncate"
        @click="handleSortChange('created')"
      >
        <span>Date</span>
        <IH-arrow-sm-down v-if="sortBy === 'created-desc'" class="shrink-0" />
        <IH-arrow-sm-up v-else-if="sortBy === 'created-asc'" class="shrink-0" />
      </button>
      <button
        type="button"
        class="max-w-[144px] w-[144px] flex items-center justify-end hover:text-skin-link space-x-1 truncate"
        @click="handleSortChange('vp')"
      >
        <span class="truncate">Voting power</span>
        <IH-arrow-sm-down v-if="sortBy === 'vp-desc'" class="shrink-0" />
        <IH-arrow-sm-up v-else-if="sortBy === 'vp-asc'" class="shrink-0" />
      </button>
      <div class="min-w-[44px] lg:w-[60px]" />
    </div>
  </UiColumnHeader>
  <UiScrollerHorizontal @scroll="handleScrollEvent">
    <div class="min-w-[735px]">
      <UiLoading v-if="isPending" class="px-4 py-3 block absolute" />
      <UiStateWarning v-if="isError" class="px-4 py-3">
        Failed to load votes.
      </UiStateWarning>
      <UiStateWarning v-if="data?.pages.flat().length === 0" class="px-4 py-3">
        There are no votes here.
      </UiStateWarning>
      <UiContainerInfiniteScroll
        v-if="data"
        :loading-more="isFetchingNextPage"
        @end-reached="handleEndReached"
      >
        <template #loading>
          <UiLoading class="px-4 py-3 block" />
        </template>
        <div
          v-for="(vote, i) in data.pages.flat()"
          :key="i"
          class="border-b flex space-x-3"
        >
          <div
            class="right-0 h-[8px] absolute"
            :style="{
              width: `${((100 / proposal.scores_total) * vote.vp).toFixed(2)}%`
            }"
            :class="
              proposal.type === 'basic'
                ? `choice-bg opacity-20 _${vote.choice}`
                : 'bg-skin-border'
            "
          />
          <AppLink
            :to="{
              name: 'space-user-statement',
              params: {
                space: `${proposal.network}:${proposal.space.id}`,
                user: vote.voter.id
              }
            }"
            class="leading-[22px] !ml-4 py-3 max-w-[218px] w-[218px] flex items-center space-x-3 truncate group"
          >
            <UiStamp :id="vote.voter.id" :size="32" />
            <div class="flex flex-col truncate">
              <h4
                class="truncate"
                v-text="vote.voter.name || shortenAddress(vote.voter.id)"
              />
              <UiAddress
                :address="vote.voter.id"
                class="text-[17px] text-skin-text truncate"
              />
            </div>
          </AppLink>
          <button
            type="button"
            class="grow w-[40%] flex flex-col items-start justify-center truncate leading-[22px]"
            :disabled="!vote.reason"
            @click="handleChoiceClick(vote)"
          >
            <ProposalVoteChoice :proposal="proposal" :vote="vote" />
          </button>
          <div
            class="leading-[22px] max-w-[144px] w-[144px] flex flex-col justify-center truncate"
          >
            <TimeRelative v-slot="{ relativeTime }" :time="vote.created">
              <h4>{{ relativeTime }}</h4>
            </TimeRelative>
            <div class="text-[17px]">
              {{ _t(vote.created, 'MMM D, YYYY') }}
            </div>
          </div>
          <div
            class="leading-[22px] max-w-[144px] w-[144px] flex flex-col justify-center text-right truncate"
          >
            <h4 class="text-skin-link truncate">
              {{ _vp(vote.vp / 10 ** votingPowerDecimals) }}
              {{ proposal.space.voting_power_symbol }}
            </h4>
            <div class="text-[17px]">
              {{ _n((vote.vp / proposal.scores_total) * 100) }}%
            </div>
          </div>
          <div
            class="min-w-[44px] lg:w-[60px] flex items-center justify-center"
          >
            <UiDropdown>
              <template #button>
                <button type="button">
                  <IH-dots-horizontal class="text-skin-link" />
                </button>
              </template>
              <template #items>
                <UiDropdownItem
                  :to="network.helpers.getExplorerUrl(vote.tx, 'transaction')"
                >
                  <IH-arrow-sm-right class="-rotate-45" :width="16" />
                  {{
                    offchainNetworks.includes(proposal.network)
                      ? 'Verify signature'
                      : 'View on block explorer'
                  }}
                </UiDropdownItem>
              </template>
            </UiDropdown>
          </div>
        </div>
      </UiContainerInfiniteScroll>
    </div>
  </UiScrollerHorizontal>
  <teleport to="#modal">
    <ModalVoteReason
      :open="modalOpen"
      :vote="selectedVote"
      @close="
        modalOpen = false;
        selectedVote = null;
      "
    />
  </teleport>
</template>
