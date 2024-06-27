<script setup lang="ts">
import ProposalIconStatus from '@/components/ProposalIconStatus.vue';
import { Space } from '@/types';
import { ProposalsFilter } from '@/networks/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();
const { web3 } = useWeb3();
const votingPowersStore = useVotingPowersStore();
const proposalsStore = useProposalsStore();

const state = ref<NonNullable<ProposalsFilter['state']>>('any');

const selectIconBaseProps = {
  width: 16,
  height: 16
};

const proposalsRecord = computed(
  () => proposalsStore.proposals[`${props.space.network}:${props.space.id}`]
);

const votingPower = computed(() => votingPowersStore.get(props.space));

async function handleEndReached() {
  if (!proposalsRecord.value?.hasMoreProposals) return;

  proposalsStore.fetchMore(props.space.id, props.space.network);
}

watch(
  [props.space, state],
  ([toSpace, toState], [fromSpace, fromState]) => {
    if (toSpace.id !== fromSpace?.id || toState !== fromState) {
      proposalsStore.reset(toSpace.id, toSpace.network);
      proposalsStore.fetch(toSpace.id, toSpace.network, toState);
    }

    if (toSpace.id !== fromSpace?.id) {
      votingPowersStore.fetch(toSpace, web3.value.account);
    }
  },
  { immediate: true }
);

watch(
  () => web3.value.account,
  account => {
    votingPowersStore.reset();
    votingPowersStore.fetch(props.space, account);
  }
);

watchEffect(() => setTitle(`Proposals - ${props.space.name}`));
</script>

<template>
  <div>
    <div class="flex justify-between">
      <div class="flex flex-row p-4 space-x-2">
        <UiSelectDropdown
          v-model="state"
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
      <div class="flex flex-row p-4 space-x-2">
        <IndicatorVotingPower
          :network-id="space.network"
          :voting-power="votingPower"
          @fetch-voting-power="() => votingPowersStore.fetch(space, web3.account)"
        />
        <router-link :to="{ name: 'editor' }">
          <UiTooltip title="New proposal">
            <UiButton class="!px-0 w-[46px]">
              <IH-pencil-alt class="inline-block" />
            </UiButton>
          </UiTooltip>
        </router-link>
      </div>
    </div>
    <ProposalsList
      title="Proposals"
      limit="off"
      :loading="!proposalsRecord?.loaded"
      :loading-more="proposalsRecord?.loadingMore"
      :proposals="proposalsStore.getSpaceProposals(props.space.id, props.space.network)"
      @end-reached="handleEndReached"
    />
  </div>
</template>
