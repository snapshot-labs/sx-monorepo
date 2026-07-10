<script setup lang="ts">
import { ANY_SPACE } from '@/composables/useProposalsFilters';
import {
  getOrgProposalLabel,
  getOrgProposalSpaces
} from '@/helpers/organizations';
import { useProposalsQuery } from '@/queries/proposals';
import { useSpaceVotingPowerQuery } from '@/queries/votingPower';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();
const route = useRoute();
const { organization } = useOrganization();
const { web3 } = useWeb3();

const groupSpaces = computed(() =>
  getOrgProposalSpaces(organization.value, props.space.network)
);

const {
  state,
  labels,
  selectedSpaceId,
  selectedSpace,
  hasSpaceFilter,
  spaceLabels
} = useProposalsFilters(toRef(props, 'space'), groupSpaces);

const isMergedList = computed(() => !selectedSpace.value);

const spacesItems = computed(() => [
  { key: ANY_SPACE, label: 'Any' },
  ...groupSpaces.value.map(s => ({
    key: s.id,
    label: s.name
  }))
]);

const queriedSpaceIds = computed(() => {
  if (!hasSpaceFilter.value) return [props.space.id];

  return selectedSpace.value
    ? [selectedSpace.value.id]
    : groupSpaces.value.map(s => s.id);
});

const proposalsLabel = computed(() => {
  const spaceId = selectedSpace.value
    ? `${props.space.network}:${selectedSpace.value.id}`
    : undefined;

  return getOrgProposalLabel(organization.value, spaceId) ?? 'Proposals';
});

const {
  data: votingPower,
  isPending: isVotingPowerPending,
  isError: isVotingPowerError,
  refetch: fetchVotingPower
} = useSpaceVotingPowerQuery(
  toRef(() => web3.value.account),
  toRef(() => selectedSpace.value ?? props.space)
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
  queriedSpaceIds,
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

watchEffect(() => setTitle(`${proposalsLabel.value} - ${props.space.name}`));
</script>

<template>
  <div>
    <div
      class="flex justify-between p-4 gap-2 gap-y-3 flex-row"
      :class="{ 'flex-col-reverse sm:flex-row': selectedSpace?.labels?.length }"
    >
      <ProposalsFilters
        v-model:state="state"
        v-model:labels="labels"
        v-model:selected-space-id="selectedSpaceId"
        :spaces-items="hasSpaceFilter ? spacesItems : undefined"
        :space-labels="spaceLabels"
        :labels-list="selectedSpace?.labels"
      />
      <div class="flex gap-2 truncate">
        <IndicatorVotingPower
          v-if="selectedSpace"
          :network-id="space.network"
          :voting-power="votingPower"
          :is-loading="isVotingPowerPending"
          :is-error="isVotingPowerError"
          @fetch="fetchVotingPower"
        />
        <ButtonNewProposal
          :spaces="hasSpaceFilter ? groupSpaces : [space]"
          gap="12"
          placement="end"
        />
      </div>
    </div>
    <ProposalsList
      :title="proposalsLabel"
      limit="off"
      :is-error="isError"
      :loading="isPending"
      :loading-more="isFetchingNextPage"
      :proposals="data?.pages.flat() ?? []"
      @end-reached="handleEndReached"
    >
      <template v-if="isMergedList" #item-meta="{ proposal }">
        {{ proposal.space.name }}
      </template>
    </ProposalsList>
  </div>
</template>
