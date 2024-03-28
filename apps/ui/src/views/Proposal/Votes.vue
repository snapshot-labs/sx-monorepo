<script setup lang="ts">
import { getNetwork, offchainNetworks } from '@/networks';
import { shortenAddress, _t, _rt, _n, getChoiceText } from '@/helpers/utils';
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
      <tr>
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
        <th class="font-medium">
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
              <div class="relative bottom-[1px] flex items-center min-w-0 hover:text-skin-link">
                <span class="truncate">Choice</span>
                <IH-adjustments-vertical class="ml-2" />
              </div>
            </template>
          </UiSelectDropdown>
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
      <UiLoading class="px-4 py-3 block" />
    </td>
    <template v-else>
      <tbody>
        <td v-if="votes.length === 0" class="px-4 py-3 flex items-center" colspan="5">
          <IH-exclamation-circle class="inline-block mr-2" />
          <span v-text="'There are no votes here.'" />
        </td>
        <UiContainerInfiniteScroll :loading-more="loadingMore" @end-reached="handleEndReached">
          <template #loading>
            <td colspan="5">
              <UiLoading class="px-4 py-3 block" />
            </td>
          </template>
          <tr v-for="(vote, i) in votes" :key="i" class="border-b relative align-middle">
            <div
              class="absolute top-0 -bottom-[1px] left-0 pointer-events-none"
              :style="{
                width: `${((100 / proposal.scores_total) * vote.vp).toFixed(2)}%`
              }"
              :class="
                proposal.type === 'basic'
                  ? `choice-bg opacity-[0.1] _${vote.choice}`
                  : 'bg-skin-border opacity-40'
              "
            />
            <td class="relative text-left flex items-center pl-4 py-3">
              <UiStamp :id="vote.voter.id" :size="32" class="mr-3" />
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
                    <div
                      class="text-[17px] text-skin-text"
                      v-text="shortenAddress(vote.voter.id)"
                    />
                  </div>
                </router-link>
              </div>
            </td>
            <td class="relative hidden lg:table-cell">
              <div class="leading-[22px]">
                <h4>{{ _rt(vote.created) }}</h4>
                <div class="text-[17px]">{{ _t(vote.created, 'MMM D, YYYY') }}</div>
              </div>
            </td>
            <td class="relative">
              <template v-if="!!props.proposal.privacy && !props.proposal.completed">
                <div class="hidden md:block">
                  <div class="flex gap-1 items-center">
                    <span class="text-skin-heading leading-6">Encrypted choice</span>
                    <IH-lock-closed class="w-[16px] h-[16px] shrink-0" />
                  </div>
                </div>
                <UiTooltip title="Encrypted choice" class="cursor-help md:hidden">
                  <IH-lock-closed class="w-[16px] h-[16px]" />
                </UiTooltip>
              </template>
              <div v-else>
                <UiTooltip
                  v-if="proposal.type !== 'basic'"
                  class="truncate !block"
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
              </div>
            </td>
            <td class="relative pr-2 text-right">
              <div class="text-skin-link leading-[22px]">
                <h4>
                  {{ _n(vote.vp / 10 ** votingPowerDecimals, 'compact') }}
                  {{ proposal.space.voting_power_symbol }}
                </h4>
              </div>
              <div class="text-[17px]">{{ _n((vote.vp / proposal.scores_total) * 100) }}%</div>
            </td>
            <td class="relative">
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
          </tr>
        </UiContainerInfiniteScroll>
      </tbody>
    </template>
  </table>
</template>
