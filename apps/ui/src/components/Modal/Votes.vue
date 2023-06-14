<script setup lang="ts">
import { getNetwork } from '@/networks';
import { shortenAddress } from '@/helpers/utils';
import choices from '@/helpers/choices.json';
import { NetworkID, Proposal as ProposalType, Vote } from '@/types';

const LIMIT = 20;

const props = defineProps<{
  open: boolean;
  networkId: NetworkID;
  proposal: ProposalType;
}>();

defineEmits<{
  (e: 'close');
}>();

const votes: Ref<Vote[]> = ref([]);
const loaded = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const { open } = toRefs(props);

const network = computed(() => getNetwork(props.proposal.network));

function reset() {
  votes.value = [];
  loaded.value = false;
  loadingMore.value = false;
  hasMore.value = false;
}

async function loadVotes() {
  votes.value = await network.value.api.loadProposalVotes(props.proposal, { limit: LIMIT });
  hasMore.value = votes.value.length === LIMIT;
  loaded.value = true;
}

async function handleEndReached() {
  if (loadingMore.value || !hasMore.value) return;

  loadingMore.value = true;
  const newVotes = await network.value.api.loadProposalVotes(props.proposal, {
    limit: LIMIT,
    skip: votes.value.length
  });
  hasMore.value = newVotes.length === LIMIT;
  votes.value = [...votes.value, ...newVotes];
  loadingMore.value = false;
}

watch([open, () => props.proposal.id], ([toOpen, toId], [, fromId]) => {
  if (toOpen === false) return;
  if (loaded.value && toId === fromId) return;

  loadVotes();
});

onMounted(() => {
  if (!open.value) return;

  loadVotes();
});

watch(
  () => props.proposal.id,
  (toId, fromId) => {
    if (toId === fromId) return;

    reset();
  }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Votes'" />
    </template>
    <UiLoading v-if="!loaded" class="p-4 block text-center" />
    <div v-else>
      <div v-if="votes.length > 0">
        <BlockInfiniteScroller :loading-more="loadingMore" @end-reached="handleEndReached">
          <div
            v-for="(vote, i) in votes"
            :key="i"
            class="py-3 px-4 border-b relative"
            :class="{ 'last:border-b-0': !loadingMore }"
          >
            <div
              class="absolute choice-bg top-0 bottom-0 right-0 opacity-10"
              :style="{
                width: `${((100 / proposal.scores_total) * vote.vp).toFixed(2)}%`
              }"
              :class="`_${vote.choice}`"
            />
            <Stamp :id="vote.voter.id" :size="24" class="mr-2" />
            <router-link
              :to="{
                name: 'user',
                params: {
                  id: `${proposal.network}:${vote.voter.id}`
                }
              }"
              @click="$emit('close')"
            >
              {{ vote.voter.name || shortenAddress(vote.voter.id) }}
            </router-link>
            <div class="absolute right-4 top-3 text-skin-link" v-text="choices[vote.choice]" />
          </div>
        </BlockInfiniteScroller>
      </div>
      <div v-else class="p-4 text-center">There isn't any votes yet!</div>
    </div>
  </UiModal>
</template>
