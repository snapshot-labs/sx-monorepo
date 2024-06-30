<script setup lang="ts">
import { getNetwork, offchainNetworks } from '@/networks';
import { shortenAddress, _t, _rt, _n, getChoiceText, _vp } from '@/helpers/utils';
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
const sortBy = ref('vp-desc' as 'vp-desc' | 'vp-asc' | 'created-desc' | 'created-asc');
const choiceFilter = ref('any' as 'any' | 'for' | 'against' | 'abstain');

const network = computed(() => getNetwork(props.proposal.network));
const votingPowerDecimals = computed(() => {
  return Math.max(
    ...props.proposal.space.strategies_parsed_metadata.map(metadata => metadata.decimals),
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
    sortBy.value = sortBy.value.endsWith('desc') ? `${type}-asc` : `${type}-desc`;
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

onMounted(() => {
  loadVotes();
});

watch(
  () => props.proposal.id,
  (toId, fromId) => {
    if (toId === fromId) return;

    reset();
  }
);

watch([sortBy, choiceFilter], () => {
  reset();
  loadVotes();
});
</script>

<template>
  <div
    class="bg-skin-bg sticky top-[112px] lg:top-[113px] z-40 border-b flex space-x-1 font-medium"
  >
    <div class="pl-4 w-[50%] lg:w-[40%] truncate">Voter</div>
    <button
      class="hidden lg:flex w-[25%] lg:w-[20%] items-center hover:text-skin-link space-x-1 truncate"
      @click="handleSortChange('created')"
    >
      <span>Date</span>
      <IH-arrow-sm-down v-if="sortBy === 'created-desc'" class="shrink-0" />
      <IH-arrow-sm-up v-else-if="sortBy === 'created-asc'" class="shrink-0" />
    </button>
    <div class="w-[25%] lg:w-[20%] truncate">
      <template v-if="offchainNetworks.includes(proposal.network)">Choice</template>
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
          { key: 'against', label: 'Against', indicator: 'bg-skin-danger' },
          { key: 'abstain', label: 'Abstain', indicator: 'bg-skin-text' }
        ]"
      >
        <template #button>
          <div class="flex items-center hover:text-skin-link space-x-2">
            <span class="truncate">Choice</span>
            <IH-adjustments-vertical class="shrink-0" />
          </div>
        </template>
      </UiSelectDropdown>
    </div>
    <button
      class="w-[25%] lg:w-[20%] flex justify-end items-center hover:text-skin-link space-x-1 truncate"
      @click="handleSortChange('vp')"
    >
      <span class="truncate">Voting power</span>
      <IH-arrow-sm-down v-if="sortBy === 'vp-desc'" class="shrink-0" />
      <IH-arrow-sm-up v-else-if="sortBy === 'vp-asc'" class="shrink-0" />
    </button>
    <div class="w-[30px] lg:w-[60px]" />
  </div>

  <UiLoading v-if="!loaded" class="px-4 py-3 block" />
  <template v-else>
    <div v-if="votes.length === 0" class="px-4 py-3 flex items-center space-x-2">
      <IH-exclamation-circle class="inline-block" />
      <span>There are no votes here.</span>
    </div>
    <UiContainerInfiniteScroll :loading-more="loadingMore" @end-reached="handleEndReached">
      <template #loading>
        <UiLoading class="px-4 py-3 block" />
      </template>
      <div v-for="(vote, i) in votes" :key="i" class="border-b relative flex space-x-1">
        <div
          class="top-0 bottom-0 left-0 -z-10 pointer-events-none absolute"
          :style="{
            width: `${((100 / proposal.scores_total) * vote.vp).toFixed(2)}%`
          }"
          :class="
            proposal.type === 'basic'
              ? `choice-bg opacity-[0.1] _${vote.choice}`
              : 'bg-skin-border opacity-40'
          "
        />
        <div class="pl-4 py-3 w-[50%] lg:w-[40%] flex items-center gap-x-3 truncate">
          <UiStamp :id="vote.voter.id" :size="32" />
          <router-link
            :to="{
              name: 'space-user-statement',
              params: {
                id: `${proposal.network}:${proposal.space.id}`,
                user: vote.voter.id
              }
            }"
            class="overflow-hidden leading-[22px]"
          >
            <h4 class="truncate" v-text="vote.voter.name || shortenAddress(vote.voter.id)" />
            <div
              class="text-[17px] text-skin-text truncate"
              v-text="shortenAddress(vote.voter.id)"
            />
          </router-link>
        </div>
        <div
          class="hidden leading-[22px] w-[25%] lg:w-[20%] lg:flex flex-col justify-center truncate"
        >
          <h4>{{ _rt(vote.created) }}</h4>
          <div class="text-[17px]">{{ _t(vote.created, 'MMM D, YYYY') }}</div>
        </div>
        <div class="w-[25%] lg:w-[20%] flex items-center truncate">
          <template v-if="!!props.proposal.privacy && !props.proposal.completed">
            <div class="hidden md:block">
              <div class="flex gap-1 items-center">
                <span class="text-skin-heading leading-[22px]">Encrypted choice</span>
                <IH-lock-closed class="w-[16px] h-[16px] shrink-0" />
              </div>
            </div>
            <UiTooltip title="Encrypted choice" class="cursor-help md:hidden">
              <IH-lock-closed class="w-[16px] h-[16px]" />
            </UiTooltip>
          </template>
          <template v-else>
            <UiTooltip
              v-if="proposal.type !== 'basic'"
              class="max-w-[100%] truncate !inline-block"
              :title="getChoiceText(proposal.choices, vote.choice)"
            >
              {{ getChoiceText(proposal.choices, vote.choice) }}
            </UiTooltip>
            <UiButton
              v-else
              class="!w-[40px] !h-[40px] !px-0 cursor-default bg-transparent"
              :class="{
                '!text-skin-success !border-skin-success': vote.choice === 1,
                '!text-skin-danger !border-skin-danger': vote.choice === 2,
                '!text-gray-500 !border-gray-500': vote.choice === 3
              }"
            >
              <IH-check v-if="vote.choice === 1" class="inline-block" />
              <IH-x v-else-if="vote.choice === 2" class="inline-block" />
              <IH-minus-sm v-else class="inline-block" />
            </UiButton>
          </template>
        </div>
        <div
          class="text-right leading-[22px] w-[25%] lg:w-[20%] flex flex-col items-end justify-center truncate"
        >
          <h4 class="text-skin-link">
            {{ _vp(vote.vp / 10 ** votingPowerDecimals) }}
            {{ proposal.space.voting_power_symbol }}
          </h4>
          <div class="text-[17px]">{{ _n((vote.vp / proposal.scores_total) * 100) }}%</div>
        </div>
        <div class="w-[30px] lg:w-[60px] flex items-center justify-center">
          <UiDropdown>
            <template #button>
              <IH-dots-vertical class="text-skin-link" />
            </template>
            <template #items>
              <UiDropdownItem v-slot="{ active }">
                <a
                  :href="network.helpers.getExplorerUrl(vote.tx, 'transaction')"
                  target="_blank"
                  class="flex items-center gap-2"
                  :class="{ 'opacity-80': active }"
                >
                  <IH-arrow-sm-right class="-rotate-45" :width="16" />
                  View on block explorer
                </a>
              </UiDropdownItem>
              <UiDropdownItem v-slot="{ active }">
                <a
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
                </a>
              </UiDropdownItem>
            </template>
          </UiDropdown>
        </div>
      </div>
    </UiContainerInfiniteScroll>
  </template>
</template>
