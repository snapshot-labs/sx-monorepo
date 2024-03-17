<script setup lang="ts">
import ProposalIconStatus from '@/components/ProposalIconStatus.vue';
import { getNetwork, supportsNullCurrent } from '@/networks';
import { Space } from '@/types';
import { VotingPower, VotingPowerStatus } from '@/networks/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();
const { web3 } = useWeb3();
const { getCurrent } = useMetaStore();
const proposalsStore = useProposalsStore();

const votingPowers = ref([] as VotingPower[]);
const votingPowerStatus = ref<VotingPowerStatus>('loading');
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
    votingPowerStatus.value = 'success';
    return;
  }

  votingPowerStatus.value = 'loading';
  try {
    votingPowers.value = await network.value.actions.getVotingPower(
      props.space.id,
      props.space.strategies,
      props.space.strategies_params,
      props.space.strategies_parsed_metadata,
      web3.value.account,
      {
        at: supportsNullCurrent(props.space.network) ? null : getCurrent(props.space.network) || 0,
        chainId: props.space.snapshot_chain_id
      }
    );
    votingPowerStatus.value = 'success';
  } catch (e) {
    console.warn('Failed to load voting power', e);
    votingPowers.value = [];
    votingPowerStatus.value = 'error';
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

watchEffect(() => setTitle(`Proposals - ${props.space.name}`));
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
      <div class="flex flex-row p-4 space-x-2">
        <IndicatorVotingPower
          :network-id="space.network"
          :status="votingPowerStatus"
          :voting-power-symbol="space.voting_power_symbol"
          :voting-powers="votingPowers"
          @get-voting-power="getVotingPower"
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
