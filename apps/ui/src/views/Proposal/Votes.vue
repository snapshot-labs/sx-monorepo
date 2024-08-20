<script setup lang="ts">
import {
  _n,
  _rt,
  _t,
  _vp,
  getChoiceText,
  shortenAddress
} from '@/helpers/utils';
import { getNetwork, offchainNetworks } from '@/networks';
import { Proposal as ProposalType, Vote } from '@/types';

const LIMIT = 20;

const props = defineProps<{
  proposal: ProposalType;
}>();

const { copy, copied } = useClipboard();

const votes: Ref<Vote[]> = ref([]);
const loaded = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const sortBy = ref(
  'vp-desc' as 'vp-desc' | 'vp-asc' | 'created-desc' | 'created-asc'
);
const choiceFilter = ref('any' as 'any' | 'for' | 'against' | 'abstain');
const modalOpen = ref(false);
const selectedVote = ref<Vote | null>(null);
const containerWidth = ref(0);
const el = ref<HTMLElement | null>(null);
const { x } = useScroll(el);

useResizeObserver(el, ([{ contentRect }]) => {
  const { width } = contentRect;
  containerWidth.value = width;
});

const network = computed(() => getNetwork(props.proposal.network));
const votingPowerDecimals = computed(() => {
  return Math.max(
    ...props.proposal.space.strategies_parsed_metadata.map(
      metadata => metadata.decimals
    ),
    0
  );
});

function reset() {
  votes.value = [];
  loaded.value = false;
  loadingMore.value = false;
  hasMore.value = false;
}

async function loadVotes() {
  votes.value = await network.value.api.loadProposalVotes(
    props.proposal,
    { limit: LIMIT },
    choiceFilter.value,
    sortBy.value
  );
  hasMore.value = votes.value.length >= LIMIT;
  loaded.value = true;
}

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
  if (loadingMore.value || !hasMore.value) return;

  loadingMore.value = true;
  const newVotes = await network.value.api.loadProposalVotes(
    props.proposal,
    {
      limit: LIMIT,
      skip: votes.value.length
    },
    choiceFilter.value,
    sortBy.value
  );
  hasMore.value = newVotes.length >= LIMIT;
  votes.value = [...votes.value, ...newVotes];
  loadingMore.value = false;
}

function handleChoiceClick(vote: Vote | null) {
  if (!vote?.reason) return;

  selectedVote.value = vote;
  modalOpen.value = true;
}

onMounted(() => {
  loadVotes();
});

watch(
  () => props.proposal.id,
  (toId, fromId) => {
    if (toId === fromId) return;

    reset();
    loadVotes();
  }
);

watch([sortBy, choiceFilter], () => {
  reset();
  loadVotes();
});
</script>

<template>
  <div class="bg-skin-bg sticky top-[113px] z-40 border-b overflow-hidden">
    <div
      class="flex space-x-3 font-medium min-w-[735px]"
      :style="{
        marginLeft: `-${x}px`
      }"
    >
      <div class="ml-4 max-w-[218px] w-[218px] truncate">Voter</div>
      <div class="grow w-[40%]">
        <template v-if="offchainNetworks.includes(proposal.network)"
          >Choice</template
        >
        <UiSelectDropdown
          v-else
          v-model="choiceFilter"
          class="font-normal"
          title="Choice"
          gap="12px"
          placement="left"
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
  </div>
  <div ref="el" class="overflow-x-auto no-scrollbar">
    <div data-no-sidebar-swipe class="min-w-[735px]">
      <UiLoading v-if="!loaded" class="px-4 py-3 block absolute" />
      <template v-else>
        <div
          v-if="votes.length === 0"
          class="px-4 py-3 flex items-center space-x-2"
        >
          <IH-exclamation-circle class="inline-block" />
          <span>There are no votes here.</span>
        </div>

        <UiContainerInfiniteScroll
          :loading-more="loadingMore"
          @end-reached="handleEndReached"
        >
          <template #loading>
            <UiLoading class="px-4 py-3 block" />
          </template>
          <div
            v-for="(vote, i) in votes"
            :key="i"
            class="relative border-b flex space-x-3"
          >
            <div
              class="absolute -z-10 pointer-events-none h-[76px]"
              :style="{
                width: `${containerWidth}px`,
                'margin-left': `${x}px`
              }"
            >
              <div
                class="inset-y-0 left-0 absolute"
                :style="{
                  width: `${((100 / proposal.scores_total) * vote.vp).toFixed(2)}%`
                }"
                :class="
                  proposal.type === 'basic'
                    ? `choice-bg opacity-[0.1] _${vote.choice}`
                    : 'bg-skin-border opacity-40'
                "
              />
            </div>
            <router-link
              :to="{
                name: 'space-user-statement',
                params: {
                  id: `${proposal.network}:${proposal.space.id}`,
                  user: vote.voter.id
                }
              }"
              class="leading-[22px] !ml-4 py-3 max-w-[218px] w-[218px] flex items-center space-x-3 truncate"
            >
              <UiStamp :id="vote.voter.id" :size="32" />
              <div class="flex flex-col truncate">
                <h4
                  class="truncate"
                  v-text="vote.voter.name || shortenAddress(vote.voter.id)"
                />
                <div
                  class="text-[17px] text-skin-text truncate"
                  v-text="shortenAddress(vote.voter.id)"
                />
              </div>
            </router-link>
            <button
              type="button"
              class="grow w-[40%] flex flex-col items-start justify-center truncate leading-[22px]"
              :disabled="!vote.reason"
              @click="handleChoiceClick(vote)"
            >
              <template
                v-if="!!props.proposal.privacy && !props.proposal.completed"
              >
                <div class="flex gap-1 items-center">
                  <span class="text-skin-heading leading-[22px]"
                    >Encrypted choice</span
                  >
                  <IH-lock-closed class="size-[16px] shrink-0" />
                </div>
              </template>
              <template v-else>
                <UiTooltip
                  v-if="proposal.type !== 'basic'"
                  :title="getChoiceText(proposal.choices, vote.choice)"
                  class="max-w-[100%] truncate"
                >
                  <h4 class="truncate">
                    {{ getChoiceText(proposal.choices, vote.choice) }}
                  </h4>
                </UiTooltip>
                <div v-else class="flex items-center space-x-2">
                  <div
                    class="rounded-full choice-bg inline-block size-[18px]"
                    :class="`_${vote.choice}`"
                  >
                    <IH-check
                      v-if="vote.choice === 1"
                      class="text-white size-[14px] mt-0.5 ml-0.5"
                    />
                    <IH-x
                      v-else-if="vote.choice === 2"
                      class="text-white size-[14px] mt-0.5 ml-0.5"
                    />
                    <IH-minus-sm
                      v-else-if="vote.choice === 3"
                      class="text-white size-[14px] mt-0.5 ml-0.5"
                    />
                  </div>
                  <h4
                    class="truncate grow"
                    v-text="proposal.choices[(vote.choice as number) - 1]"
                  />
                </div>
                <div class="text-[17px] max-w-[100%] truncate">
                  {{ vote.reason }}
                </div>
              </template>
            </button>
            <div
              class="leading-[22px] max-w-[144px] w-[144px] flex flex-col justify-center truncate"
            >
              <h4>{{ _rt(vote.created) }}</h4>
              <div class="text-[17px]">
                {{ _t(vote.created, 'MMM D, YYYY') }}
              </div>
            </div>
            <div
              class="leading-[22px] max-w-[144px] w-[144px] flex flex-col justify-center items-end truncate"
            >
              <h4 class="text-skin-link">
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
                  <UiButton class="!p-0 border-0 !h-[auto] bg-transparent">
                    <IH-dots-horizontal class="text-skin-link" />
                  </UiButton>
                </template>
                <template #items>
                  <UiDropdownItem v-slot="{ active }">
                    <a
                      :href="
                        network.helpers.getExplorerUrl(vote.tx, 'transaction')
                      "
                      target="_blank"
                      class="flex items-center gap-2"
                      :class="{ 'opacity-80': active }"
                    >
                      <IH-arrow-sm-right class="-rotate-45" :width="16" />
                      View on block explorer
                    </a>
                  </UiDropdownItem>
                  <UiDropdownItem v-slot="{ active }">
                    <button
                      type="button"
                      class="flex items-center gap-2"
                      :class="{ 'opacity-80': active }"
                      @click.prevent="copy(vote.voter.id)"
                    >
                      <template v-if="!copied">
                        <IH-duplicate :width="16" />
                        Copy voter address
                      </template>
                      <template v-else>
                        <IH-check :width="16" />
                        Copied
                      </template>
                    </button>
                  </UiDropdownItem>
                </template>
              </UiDropdown>
            </div>
          </div>
        </UiContainerInfiniteScroll>
      </template>
    </div>
  </div>

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
