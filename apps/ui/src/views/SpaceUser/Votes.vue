<script setup lang="ts">
import { getNetwork } from '@/networks';
import { Proposal, Space, User, Vote } from '@/types';

const props = defineProps<{ space: Space; user: User }>();

const PAGINATION_LIMIT = 20;
const VOTES_LIMIT = 1000;

const metaStore = useMetaStore();

const loaded = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const failed = ref(false);
const proposals = ref<Proposal[]>([]);
const votes = ref<Vote[]>([]);

const network = computed(() => getNetwork(props.space.network));

async function loadVotes() {
  try {
    votes.value = Object.values(
      await network.value.api.loadUserVotes([props.space.id], props.user.id, {
        limit: VOTES_LIMIT
      })
    );
  } catch (e) {
    failed.value = true;
  }
}

async function fetch() {
  loaded.value = false;
  const ids = votes.value.slice(0, PAGINATION_LIMIT).map(vote => vote.proposal);

  if (ids.length) {
    proposals.value = await network.value.api.loadProposals(
      [props.space.id],
      {
        limit: PAGINATION_LIMIT
      },
      metaStore.getCurrent(props.space.network) || 0,
      { id_in: ids }
    );

    hasMore.value = proposals.value.length === PAGINATION_LIMIT;
  }

  loaded.value = true;
}

async function fetchMore() {
  const ids = votes.value
    .slice(proposals.value.length, proposals.value.length + PAGINATION_LIMIT)
    .map(vote => vote.proposal);

  if (!ids.length) {
    hasMore.value = false;
    return;
  }

  loadingMore.value = true;
  const moreProposals = await network.value.api.loadProposals(
    [props.space.id],
    {
      limit: PAGINATION_LIMIT
    },
    metaStore.getCurrent(props.space.network) || 0,
    { id_in: ids }
  );

  proposals.value = [...proposals.value, ...moreProposals];
  hasMore.value = moreProposals.length === PAGINATION_LIMIT;
  loadingMore.value = false;
}

async function handleEndReached() {
  if (!hasMore.value) return;

  fetchMore();
}

onMounted(async () => {
  await loadVotes();
  fetch();
});
</script>

<template>
  <div
    class="bg-skin-bg sticky top-[112px] lg:top-[113px] z-40 border-b flex gap-3 font-medium leading-[18px] px-4 py-2"
  >
    <div class="grow truncate">Proposal</div>
    <div class="shrink-0 w-[35%] md:w-[220px] truncate">Result</div>
  </div>
  <UiLoading v-if="!loaded" class="block px-4 py-3" />
  <div
    v-else-if="!votes.length || failed"
    class="px-4 py-3 flex items-center text-skin-link gap-2"
  >
    <IH-exclamation-circle class="shrink-0" />
    <template v-if="failed">Failed to load the votes.</template>
    <template v-else>There are no votes here.</template>
  </div>
  <UiContainerInfiniteScroll
    v-else
    :loading-more="loadingMore"
    class="mx-4"
    @end-reached="handleEndReached"
  >
    <div
      v-for="(proposal, i) in proposals"
      :key="i"
      class="border-b py-[14px] flex gap-3"
    >
      <ProposalsListItemHeading
        :proposal="proposal"
        :show-author="true"
        :show-space="false"
        :show-voted-indicator="false"
        class="grow truncate"
      />
      <div class="w-[35%] md:w-[220px] shrink-0 flex items-center">
        <ProposalVoteChoice
          :proposal="proposal"
          :vote="votes[i]"
          :show-reason="false"
        />
      </div>
    </div>
  </UiContainerInfiniteScroll>
</template>
