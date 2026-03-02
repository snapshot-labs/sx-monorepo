<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import ProposalIconStatus from '@/components/ProposalIconStatus.vue';
import { metadataNetwork } from '@/networks';
import { ProposalsFilter } from '@/networks/types';
import { useHomeProposalsQuery } from '@/queries/proposals';

const selectIconBaseProps = {
  size: 16
};

useTitle('Home');

const metaStore = useMetaStore();
const router = useRouter();
const followedSpacesStore = useFollowedSpacesStore();
const { web3 } = useWeb3();
const { loadVotes } = useAccount();

const state = ref<NonNullable<ProposalsFilter['state']>>('any');

const spacesIds = computed(
  () => followedSpacesStore.followedSpaceIdsByNetwork[metadataNetwork] ?? []
);

const {
  data,
  fetchNextPage,
  hasNextPage,
  isPending,
  isError,
  isFetchingNextPage
} = useHomeProposalsQuery(metadataNetwork, spacesIds, { state });

// NOTE: This is just wrapper for loadVotes that handles its own state.
// We only care about the loading state here.
const { isPending: isVotesQueryPending, isError: isVotesQueryError } = useQuery(
  {
    queryKey: ['homeFollowedSpacesVotes', spacesIds],
    queryFn: async () => {
      if (spacesIds.value.length === 0) return null;

      await loadVotes(metadataNetwork, spacesIds.value);

      return null;
    }
  }
);

onMounted(() => {
  metaStore.fetchBlock(metadataNetwork);
});

async function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}

watch(
  [() => web3.value.account, () => web3.value.authLoading],
  ([account, authLoading]) => {
    if (!account && !authLoading) {
      router.replace({ name: 'my-explore' });
    }
  },
  { immediate: true }
);
</script>

<template>
  <div>
    <OnboardingUser class="mb-2" />
    <div class="flex justify-between">
      <div class="min-h-[94px] flex flex-row p-4 space-x-2">
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
              componentProps: { ...selectIconBaseProps, state: 'closed' }
            }
          ]"
        />
      </div>
    </div>
    <ProposalsList
      title="Proposals"
      limit="off"
      :is-error="isError || isVotesQueryError"
      :loading="
        !followedSpacesStore.followedSpacesLoaded ||
        isPending ||
        isVotesQueryPending
      "
      :loading-more="isFetchingNextPage"
      :proposals="data?.pages.flat() ?? []"
      show-space
      @end-reached="handleEndReached"
    />
  </div>
</template>
