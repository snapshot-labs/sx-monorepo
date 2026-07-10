<script setup lang="ts">
import { useProposalsQuery } from '@/queries/proposals';
import { useSpaceVotingPowerQuery } from '@/queries/votingPower';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();
const route = useRoute();
const { web3 } = useWeb3();

const { state, labels, spaceLabels } = useProposalsFilters(
  toRef(props, 'space')
);

const {
  data: votingPower,
  isPending: isVotingPowerPending,
  isError: isVotingPowerError,
  refetch: fetchVotingPower
} = useSpaceVotingPowerQuery(
  toRef(() => web3.value.account),
  toRef(props, 'space')
);

const {
  data,
  fetchNextPage,
  hasNextPage,
  isPending,
  isError,
  isFetchingNextPage
} = useProposalsQuery(
  toRef(() => props.space.network),
  toRef(() => [props.space.id]),
  {
    state,
    labels
  },
  toRef(() => (route.query.q as string) || '')
);

async function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}

watchEffect(() => setTitle(`Proposals - ${props.space.name}`));
</script>

<template>
  <div>
    <div
      class="flex justify-between p-4 gap-2 gap-y-3 flex-row"
      :class="{ 'flex-col-reverse sm:flex-row': space.labels?.length }"
    >
      <ProposalsFilters
        v-model:state="state"
        v-model:labels="labels"
        :space-labels="spaceLabels"
        :labels-list="space.labels"
      />
      <div class="flex gap-2 truncate">
        <IndicatorVotingPower
          :network-id="space.network"
          :voting-power="votingPower"
          :is-loading="isVotingPowerPending"
          :is-error="isVotingPowerError"
          @fetch="fetchVotingPower"
        />
        <ButtonNewProposal :spaces="[space]" gap="12" placement="end" />
      </div>
    </div>
    <ProposalsList
      title="Proposals"
      limit="off"
      :is-error="isError"
      :loading="isPending"
      :loading-more="isFetchingNextPage"
      :proposals="data?.pages.flat() ?? []"
      @end-reached="handleEndReached"
    />
  </div>
</template>
