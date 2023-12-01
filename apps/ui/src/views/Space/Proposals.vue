<script setup lang="ts">
import ProposalStatusIcon from '@/components/ProposalStatusIcon.vue';
import { getNetwork, supportsNullCurrent } from '@/networks';
import { Space } from '@/types';
import { VotingPower } from '@/networks/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();
const { web3 } = useWeb3();
const { getCurrent } = useMetaStore();
const proposalsStore = useProposalsStore();

const votingPowers = ref([] as VotingPower[]);
const loadingVotingPower = ref(true);
const filter = ref('any' as 'any' | 'active' | 'pending' | 'closed');

const selectIconBaseProps = {
  width: 16,
  height: 16
};

const network = computed(() => getNetwork(props.space.network));
const proposalsRecord = computed(
  () => proposalsStore.proposals[`${props.space.network}:${props.space.id}`]
);

async function handleEndReached() {
  if (!proposalsRecord.value?.hasMoreProposals) return;

  proposalsStore.fetchMore(props.space.id, props.space.network);
}

async function getVotingPower() {
  if (!web3.value.account) {
    votingPowers.value = [];
    loadingVotingPower.value = false;
    return;
  }

  loadingVotingPower.value = true;
  try {
    votingPowers.value = await network.value.actions.getVotingPower(
      props.space.strategies,
      props.space.strategies_params,
      props.space.strategies_parsed_metadata,
      web3.value.account,
      supportsNullCurrent(props.space.network) ? null : getCurrent(props.space.network) || 0
    );
  } catch (e) {
    console.warn('Failed to load voting power', e);
    votingPowers.value = [];
  } finally {
    loadingVotingPower.value = false;
  }
}

watch(
  [props.space, filter],
  ([toSpace, toFilter], [fromSpace, fromFilter]) => {
    if (toSpace.id !== fromSpace?.id || toFilter !== fromFilter) {
      proposalsStore.reset(toSpace.id, toSpace.network);
      proposalsStore.fetch(toSpace.id, toSpace.network, toFilter);
    }

    if (toSpace.id !== fromSpace?.id) {
      getVotingPower();
    }
  },
  { immediate: true }
);

watch(
  () => web3.value.account,
  () => getVotingPower()
);

watchEffect(() => {
  setTitle(`Proposals - ${props.space.name}`);
});
</script>

<template>
  <div>
    <div class="flex justify-between">
      <div class="flex flex-row p-4 space-x-2">
        <UiSelect
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
              component: ProposalStatusIcon,
              componentProps: { ...selectIconBaseProps, state: 'pending' }
            },
            {
              key: 'active',
              label: 'Active',
              component: ProposalStatusIcon,
              componentProps: { ...selectIconBaseProps, state: 'active' }
            },
            {
              key: 'closed',
              label: 'Closed',
              component: ProposalStatusIcon,
              componentProps: { ...selectIconBaseProps, state: 'passed' }
            }
          ]"
        />
      </div>
      <div v-if="!network.readOnly" class="flex flex-row p-4 space-x-2">
        <VotingPowerIndicator
          :network-id="space.network"
          :loading="loadingVotingPower"
          :voting-power-symbol="space.voting_power_symbol"
          :voting-powers="votingPowers"
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
