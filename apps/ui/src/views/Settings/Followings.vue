<script setup lang="ts">
import ProposalIconStatus from '@/components/ProposalIconStatus.vue';
import { getNetwork } from '@/networks';
import { Proposal } from '@/types';

const PROPOSALS_LIMIT = 20;
// TODO: Handle more networks dynamically
const NETWORK_ID = 's';

useTitle('Followings');

const { web3 } = useWeb3();
const metaStore = useMetaStore();

const loaded = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const proposals = ref<Proposal[]>([]);
const followedSpaceIds = ref<string[]>([]);

const filter = ref('any' as 'any' | 'active' | 'pending' | 'closed');

const selectIconBaseProps = {
  width: 16,
  height: 16
};

const network = computed(() => getNetwork(NETWORK_ID));

async function handleEndReached() {
  if (!hasMore.value) return;

  fetchMore();
}

// TODO: Inject space to each proposals
async function loadProposals(skip = 0) {
  return network.value.api.loadProposals(
    followedSpaceIds.value,
    { limit: PROPOSALS_LIMIT, skip },
    metaStore.getCurrent(NETWORK_ID) || 0,
    filter.value
  );
}

async function fetch() {
  loaded.value = false;

  proposals.value = await loadProposals();

  hasMore.value = proposals.value.length === PROPOSALS_LIMIT;
  loaded.value = true;
}

async function fetchMore() {
  loadingMore.value = true;

  const moreProposals = await loadProposals(proposals.value.length);

  proposals.value = [...proposals.value, ...moreProposals];
  hasMore.value = moreProposals.length === PROPOSALS_LIMIT;
  loadingMore.value = false;
}

// TODO: Avoid "no proposals" message flashing when user is not logged in yet
watch(
  () => web3.value.account,
  async value => {
    if (value) {
      await metaStore.fetchBlock(NETWORK_ID);

      const user = await getNetwork(NETWORK_ID).api.loadUser(value);
      followedSpaceIds.value = user?.follows || [];

      if (followedSpaceIds.value.length) {
        fetch();
      }
    }

    loaded.value = true;
  },
  { immediate: true }
);

watch(filter, (toFilter, fromFilter) => {
  if (toFilter !== fromFilter && web3.value.account) {
    fetch();
  }
});
</script>

<template>
  <div>
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
      @end-reached="handleEndReached"
    />
  </div>
</template>
