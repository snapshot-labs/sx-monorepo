<script setup lang="ts">
import ProposalIconStatus from '@/components/ProposalIconStatus.vue';
import { getNames } from '@/helpers/stamp';
import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
import { Proposal } from '@/types';

const PROPOSALS_LIMIT = 20;

useTitle('Home');

const metaStore = useMetaStore();
const { web3 } = useWeb3();
const { loadVotes, loadFollows, follows } = useAccount();

const loaded = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const proposals = ref<Proposal[]>([]);

const filter = ref('any' as 'any' | 'active' | 'pending' | 'closed');

const selectIconBaseProps = {
  width: 16,
  height: 16
};

const networkId = computed(
  () => offchainNetworks.filter(network => enabledNetworks.includes(network))[0]
);

// TODO: Support multiple networks
const network = computed(() => getNetwork(networkId.value));

async function withAuthorNames(proposals: Proposal[]) {
  if (!proposals.length) return proposals;

  const names = await getNames(proposals.map(proposal => proposal.author.id));

  return proposals.map(proposal => {
    proposal.author.name = names[proposal.author.id];

    return proposal;
  });
}

async function loadProposalsPage(skip = 0) {
  return withAuthorNames(
    await network.value.api.loadProposals(
      follows.value,
      { limit: PROPOSALS_LIMIT, skip },
      metaStore.getCurrent(networkId.value) || 0,
      filter.value
    )
  );
}

async function fetch() {
  loaded.value = false;
  proposals.value = await loadProposalsPage();
  hasMore.value = proposals.value.length === PROPOSALS_LIMIT;
  loaded.value = true;
}

async function fetchMore() {
  loadingMore.value = true;

  const moreProposals = await loadProposalsPage(proposals.value.length);

  proposals.value = [...proposals.value, ...moreProposals];
  hasMore.value = moreProposals.length === PROPOSALS_LIMIT;
  loadingMore.value = false;
}

async function handleEndReached() {
  if (hasMore.value) fetchMore();
}

onMounted(() => {
  metaStore.fetchBlock(networkId.value);
  loadFollows(networkId.value);
});

watch(
  () => web3.value.account,
  () => loadFollows(networkId.value)
);

watch(
  () => follows.value,
  () => {
    loaded.value = false;
    proposals.value = [];

    if (!follows.value.length) {
      loaded.value = true;
      return;
    }

    loadVotes(networkId.value, follows.value);
    fetch();
  }
);

watch(filter, (toFilter, fromFilter) => {
  if (toFilter !== fromFilter && web3.value.account) fetch();
});
</script>

<template>
  <div class="flex justify-between">
    <div class="flex flex-row p-4 space-x-2">
      <UiSelectDropdown
        v-model="filter"
        title="Status"
        gap="12px"
        placement="left"
        :items="[
          {
            key: 'any',
            label: 'Any'
          },
          {
            key: 'pending',
            label: 'Pending',
            component: ProposalIconStatus,
            componentProps: { ...selectIconBaseProps, state: 'pending' }
          },
          {
            key: 'active',
            label: 'Active',
            component: ProposalIconStatus,
            componentProps: { ...selectIconBaseProps, state: 'active' }
          },
          {
            key: 'closed',
            label: 'Closed',
            component: ProposalIconStatus,
            componentProps: { ...selectIconBaseProps, state: 'passed' }
          }
        ]"
      />
    </div>
  </div>
  <ProposalsList
    title="Proposals"
    limit="off"
    :loading="!loaded"
    :loading-more="loadingMore"
    :proposals="proposals"
    show-space
    @end-reached="handleEndReached"
  />
</template>
