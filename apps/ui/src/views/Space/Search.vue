<script setup lang="ts">
import { getNetwork } from '@/networks';
import { Proposal as ProposalType, Space } from '@/types';

const PROPOSALS_LIMIT = 20;

const props = defineProps<{ space: Space }>();

const metaStore = useMetaStore();
const { setTitle } = useTitle();
const route = useRoute();

const loaded = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const proposals = ref<ProposalType[]>([]);

const query = computed(() => (route.query.q as string) || '');
const network = computed(() => getNetwork(props.space.network));

async function fetch() {
  loaded.value = false;

  proposals.value = await network.value.api.loadProposals(
    [props.space.id],
    {
      limit: PROPOSALS_LIMIT
    },
    metaStore.getCurrent(props.space.network) || 0,
    {},
    query.value
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
    {},
    query.value
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

watch(query, () => {
  fetch();
});

watchEffect(() => setTitle(`Search - ${props.space.name}`));
</script>

<template>
  <ProposalsList
    title="Proposals"
    limit="off"
    :loading="!loaded"
    :loading-more="loadingMore"
    :proposals="proposals"
    @end-reached="handleEndReached"
  />
</template>
