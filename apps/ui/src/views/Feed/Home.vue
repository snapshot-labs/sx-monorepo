<script setup lang="ts">
import ProposalIconStatus from '@/components/ProposalIconStatus.vue';
import { getNames } from '@/helpers/stamp';
import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
import { Proposal } from '@/types';

const PROPOSALS_LIMIT = 20;

useTitle('Home');

const router = useRouter();
const { web3, authInitiated } = useWeb3();
const metaStore = useMetaStore();
const uiStore = useUiStore();

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

async function handleEndReached() {
  if (hasMore.value) fetchMore();
}

async function loadProposalsPage(skip = 0) {
  return withAuthorNames(
    await network.value.api.loadProposals(
      followedSpaceIds.value,
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

watch(
  [() => web3.value.account, () => web3.value.authLoading, authInitiated],
  async ([account, authLoading, authInitiated]) => {
    if (!authInitiated || authLoading) return;

    if (!account) {
      return router.push({ name: 'landing' });
    }

    loaded.value = false;
    await metaStore.fetchBlock(networkId.value);

    const user = await getNetwork(networkId.value).api.loadUser(account);
    followedSpaceIds.value = user?.follows || [];
    proposals.value = [];

    if (!followedSpaceIds.value.length) {
      loaded.value = true;
      return;
    }

    fetch();
  },
  { immediate: true }
);

watch(filter, (toFilter, fromFilter) => {
  if (toFilter !== fromFilter && web3.value.account) fetch();
});
</script>

<template>
  <div>
    <div
      class="ml-0 lg:ml-[240px] mr-0 xl:mr-[240px]"
      :class="{ 'translate-x-[240px] lg:translate-x-0': uiStore.sidebarOpen }"
    >
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
    </div>
    <div class="invisible xl:visible fixed w-[240px] border-l bottom-0 top-[72px] right-0" />
  </div>
</template>
