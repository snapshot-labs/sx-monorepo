<script setup lang="ts">
import { getNetwork } from '@/networks';
import { shortenAddress, _t, _rt, _n } from '@/helpers/utils';
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
  hasMore.value = votes.value.length === LIMIT;
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
  hasMore.value = newVotes.length === LIMIT;
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
  <BlockInfiniteScroller :loading-more="loadingMore" @end-reached="handleEndReached">
    <table class="text-left w-full table-fixed">
      <colgroup>
        <col class="w-[50%] lg:w-[40%]" />
        <col class="w-[25%] lg:w-[20%]" />
        <col class="w-[25%] lg:w-[20%]" />
        <col class="w-[60px] lg:w-[20%]" />
        <col class="w-[0px] lg:w-[60px]" />
      </colgroup>
      <thead
        class="bg-skin-bg sticky top-[112px] lg:top-[113px] z-40 after:border-b after:absolute after:w-full"
      >
        <tr class="bg-skin-border/10">
          <th class="pl-4 font-medium">
            <span class="relative bottom-[1px]">Voter</span>
          </th>
          <th class="hidden lg:table-cell">
            <button
              class="relative bottom-[1px] flex items-center min-w-0 w-full font-medium hover:text-skin-link"
              @click="handleSortChange('created')"
            >
              <span>Date</span>
              <IH-arrow-sm-down v-if="sortBy === 'created-desc'" class="ml-1" />
              <IH-arrow-sm-up v-else-if="sortBy === 'created-asc'" class="ml-1" />
            </button>
          </th>
          <th>
            <UiSelect
              v-model="choiceFilter"
              class="font-normal"
              title="Choice"
              gap="12px"
              placement="left"
              :items="[
                { key: 'any', label: 'Any' },
                { key: 'for', label: 'For', indicator: 'bg-choice-for' },
                { key: 'against', label: 'Against', indicator: 'bg-choice-against' },
                { key: 'abstain', label: 'Abstain', indicator: 'bg-choice-abstain' }
              ]"
            >
              <template #button>
                <div
                  class="relative bottom-[1px] flex items-center min-w-0 font-medium hover:text-skin-link"
                >
                  <span class="truncate">Choice</span>
                  <IH-adjustments-vertical class="ml-2" />
                </div>
              </template>
            </UiSelect>
          </th>
          <th>
            <div class="relative bottom-[1px] flex justify-end">
              <button
                class="flex justify-end items-center min-w-0 w-full font-medium hover:text-skin-link"
                @click="handleSortChange('vp')"
              >
                <span class="truncate">Voting power</span>
                <IH-arrow-sm-down v-if="sortBy === 'vp-desc'" class="ml-1" />
                <IH-arrow-sm-up v-else-if="sortBy === 'vp-asc'" class="ml-1" />
              </button>
            </div>
          </th>
          <th />
        </tr>
      </thead>
      <td v-if="!loaded" colspan="5">
        <UiLoading class="p-4 block text-center" />
      </td>
      <template v-else>
        <tbody>
          <td v-if="votes.length === 0" class="p-4 text-center" colspan="5">
            There isn't any votes yet!
          </td>
          <tr v-for="(vote, i) in votes" :key="i" class="border-b relative">
            <td class="text-left flex items-center pl-4 py-3">
              <Stamp :id="vote.voter.id" :size="32" class="mr-3" />
              <div class="truncate">
                <router-link
                  :to="{
                    name: 'user',
                    params: {
                      id: `${proposal.network}:${vote.voter.id}`
                    }
                  }"
                >
                  <div class="leading-[22px]">
                    <h4 v-text="vote.voter.name || shortenAddress(vote.voter.id)" />
                    <div class="text-sm text-skin-text" v-text="shortenAddress(vote.voter.id)" />
                  </div>
                </router-link>
              </div>
            </td>
            <td class="hidden lg:table-cell">
              <div class="leading-[22px]">
                <h4>{{ _rt(vote.created) }}</h4>
                <div class="text-sm">{{ _t(vote.created, 'MMM D, YYYY') }}</div>
              </div>
            </td>
            <td>
              <UiButton
                class="!w-[40px] !h-[40px] !px-0 cursor-default"
                :class="{
                  '!text-green !border-green': vote.choice === 1,
                  '!text-red !border-red': vote.choice === 2,
                  '!text-gray-500 !border-gray-500': vote.choice === 3
                }"
              >
                <IH-check v-if="vote.choice === 1" class="inline-block" />
                <IH-x v-else-if="vote.choice === 2" class="inline-block" />
                <IH-minus-sm v-else class="inline-block" />
              </UiButton>
            </td>
            <td class="pr-2 text-right">
              <div class="text-skin-link leading-[22px]">
                <h4>
                  {{ _n(vote.vp / 10 ** votingPowerDecimals) }}
                  {{ proposal.space.voting_power_symbol }}
                </h4>
              </div>
              <div class="text-sm">{{ _n((vote.vp / proposal.scores_total) * 100) }}%</div>
            </td>
            <td>
              <div class="flex justify-center">
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
            </td>
            <div
              class="absolute choice-bg top-0 bottom-0 right-0 opacity-[0.04] pointer-events-none"
              :style="{
                width: `${((100 / proposal.scores_total) * vote.vp).toFixed(2)}%`
              }"
              :class="`_${vote.choice}`"
            />
          </tr>
        </tbody>
      </template>
    </table>
  </BlockInfiniteScroller>
</template>
