<script setup lang="ts">
import ProposalIconStatus from '@/components/ProposalIconStatus.vue';
import { getNames } from '@/helpers/stamp';
import { getNetwork, metadataNetwork } from '@/networks';
import { ProposalsFilter } from '@/networks/types';
import { NetworkID, Proposal } from '@/types';

const PROPOSALS_LIMIT = 20;

useTitle('Home');

const metaStore = useMetaStore();
const { modalAccountWithoutDismissOpen } = useModal();
const followedSpacesStore = useFollowedSpacesStore();
const { web3 } = useWeb3();
const { loadVotes } = useAccount();

const loaded = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const proposals = ref<Proposal[]>([]);
const state = ref<NonNullable<ProposalsFilter['state']>>('any');

const selectIconBaseProps = {
  size: 16
};

// TODO: Support multiple networks
const network = computed(() => getNetwork(metadataNetwork));

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
      followedSpacesStore.followedSpacesIds.map(
        compositeSpaceId => compositeSpaceId.split(':')[1]
      ),
      { limit: PROPOSALS_LIMIT, skip },
      metaStore.getCurrent(metadataNetwork) || 0,
      { state: state.value }
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
  metaStore.fetchBlock(metadataNetwork);
});

watch(
  [
    () => followedSpacesStore.followedSpacesLoaded,
    () => followedSpacesStore.followedSpacesIds
  ],
  ([followedSpacesloaded, followedSpacesIds]) => {
    if (!followedSpacesloaded) return;

    loaded.value = false;
    proposals.value = [];

    if (!followedSpacesIds.length) {
      loaded.value = true;
      return;
    }

    for (const network in followedSpacesStore.followedSpaceIdsByNetwork) {
      loadVotes(
        network as NetworkID,
        followedSpacesStore.followedSpaceIdsByNetwork[network]
      );
    }
    fetch();
  },
  { immediate: true }
);

watch(state, (toState, fromState) => {
  if (toState !== fromState && web3.value.account) fetch();
});

watch(
  [() => web3.value.account, () => web3.value.authLoading],
  ([account, authLoading]) => {
    if (!account && !authLoading) {
      modalAccountWithoutDismissOpen.value = true;
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  modalAccountWithoutDismissOpen.value = false;
});
</script>

<template>
  <Onboarding />
  <div class="flex justify-between">
    <div class="flex flex-row p-4 space-x-2">
      <UiSelectDropdown
        v-model="state"
        title="Status"
        gap="12"
        placement="start"
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
