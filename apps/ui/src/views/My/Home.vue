<script setup lang="ts">
import ProposalIconStatus from '@/components/ProposalIconStatus.vue';
import { metadataNetwork } from '@/networks';
import { ProposalsFilter } from '@/networks/types';
import { useHomeFeedQuery } from '@/queries/proposals';
import { NetworkID } from '@/types';

useTitle('Home');

const metaStore = useMetaStore();
const router = useRouter();
const followedSpacesStore = useFollowedSpacesStore();
const { web3 } = useWeb3();
const { loadVotes } = useAccount();

const state = ref<NonNullable<ProposalsFilter['state']>>('any');

const selectIconBaseProps = {
  size: 16
};

// TODO: Support multiple networks
const { data, fetchNextPage, hasNextPage, isPending, isFetchingNextPage } =
  useHomeFeedQuery(metadataNetwork, {
    state
  });

async function handleEndReached() {
  if (hasNextPage.value) fetchNextPage();
}

onMounted(() => {
  metaStore.fetchBlock(metadataNetwork);
});

watch(
  [
    () => followedSpacesStore.followedSpacesLoaded,
    () => followedSpacesStore.followedSpacesIds
  ],
  ([followedSpacesloaded]) => {
    if (!followedSpacesloaded) return;

    for (const network in followedSpacesStore.followedSpaceIdsByNetwork) {
      loadVotes(
        network as NetworkID,
        followedSpacesStore.followedSpaceIdsByNetwork[network]
      );
    }
  },
  { immediate: true }
);

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
              componentProps: { ...selectIconBaseProps, state: 'closed' }
            }
          ]"
        />
      </div>
    </div>
    <ProposalsList
      title="Proposals"
      limit="off"
      :loading="isPending"
      :loading-more="isFetchingNextPage"
      :proposals="data?.pages.flat() ?? []"
      show-space
      @end-reached="handleEndReached"
    />
  </div>
</template>
