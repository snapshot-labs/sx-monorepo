<script setup lang="ts">
import { getNetwork } from '@/networks';
import { Proposal, Space, User } from '@/types';

const props = defineProps<{ space: Space; user: User }>();

const PROPOSALS_LIMIT = 20;

const metaStore = useMetaStore();
const { setTitle } = useTitle();

const loaded = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const proposals = ref<Proposal[]>([]);

const network = computed(() => getNetwork(props.space.network));

async function fetch() {
  loaded.value = false;

  proposals.value = await network.value.api.loadProposals(
    [props.space.id],
    {
      limit: PROPOSALS_LIMIT
    },
    metaStore.getCurrent(props.space.network) || 0,
    { author: props.user.id }
  );

  hasMore.value = proposals.value.length === PROPOSALS_LIMIT;
  loaded.value = true;
}

async function fetchMore() {
  loadingMore.value = true;

  const moreProposals = await network.value.api.loadProposals(
    [props.space.id],
    {
      limit: PROPOSALS_LIMIT,
      skip: proposals.value.length
    },
    metaStore.getCurrent(props.space.network) || 0,
    { author: props.user.id }
  );

  proposals.value = [...proposals.value, ...moreProposals];

  hasMore.value = moreProposals.length === PROPOSALS_LIMIT;
  loadingMore.value = false;
}

async function handleEndReached() {
  if (!hasMore.value) return;

  fetchMore();
}

onMounted(() => {
  fetch();
});

watchEffect(() =>
  setTitle(
    `${props.user.name || props.user.id} ${props.space.name}'s proposals`
  )
);
</script>

<template>
  <ProposalsList
    limit="off"
    :loading="!loaded"
    :loading-more="loadingMore"
    :proposals="proposals"
    :show-author="false"
    @end-reached="handleEndReached"
  />
</template>
