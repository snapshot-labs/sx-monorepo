<script setup lang="ts">
import ProposalIconStatus from '@/components/ProposalIconStatus.vue';
import { ProposalsFilter } from '@/networks/types';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();
const {
  votingPower,
  fetch: fetchVotingPower,
  reset: resetVotingPower
} = useVotingPower();
const { web3 } = useWeb3();
const proposalsStore = useProposalsStore();

const state = ref<NonNullable<ProposalsFilter['state']>>('any');
const labels = ref<string[]>([]);

const selectIconBaseProps = {
  size: 16
};

const proposalsRecord = computed(
  () => proposalsStore.proposals[`${props.space.network}:${props.space.id}`]
);

async function handleEndReached() {
  if (!proposalsRecord.value?.hasMoreProposals) return;

  proposalsStore.fetchMore(props.space.id, props.space.network);
}

function handleFetchVotingPower() {
  fetchVotingPower(props.space);
}

function handleLabelToggle(label: string) {
  if (labels.value.includes(label)) {
    labels.value = labels.value.filter(l => l !== label);
  } else {
    labels.value = [...labels.value, label];
  }
}

watch(
  [props.space, state, labels],
  ([toSpace, toState, toLabels], [fromSpace, fromState, fromLabels]) => {
    console.log(labels.value);
    if (
      toSpace.id !== fromSpace?.id ||
      toState !== fromState ||
      toLabels !== fromLabels
    ) {
      proposalsStore.reset(toSpace.id, toSpace.network);
      proposalsStore.fetch(toSpace.id, toSpace.network, toState, toLabels);
    }
  },
  { immediate: true }
);

watch(
  [props.space, () => web3.value.account, () => web3.value.authLoading],
  ([toSpace, toAccount, toAuthLoading], [, fromAccount]) => {
    if (fromAccount && toAccount && fromAccount !== toAccount) {
      resetVotingPower();
    }

    if (toAuthLoading || !toSpace || !toAccount) return;

    handleFetchVotingPower();
  },
  { immediate: true }
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
      <div class="flex flex-row p-4 space-x-2">
        <IndicatorVotingPower
          :network-id="space.network"
          :voting-power="votingPower"
          @fetch-voting-power="handleFetchVotingPower"
        />
        <UiTooltip title="New proposal">
          <UiButton
            :to="{
              name: 'space-editor',
              params: { space: `${space.network}:${space.id}` }
            }"
            class="!px-0 w-[46px]"
          >
            <IH-pencil-alt />
          </UiButton>
        </UiTooltip>
      </div>
    </div>
    <UiLabel label="Label" />
    <div class="inline-flex flex-wrap gap-1 p-3">
      <a v-for="label in space.labels" :key="label.id">
        <UiProposalLabel
          :label="label.name"
          :color="label.color"
          :class="{
            '!opacity-40': !labels.includes(label.id) && labels.length > 0
          }"
          @click="handleLabelToggle(label.id)"
        />
      </a>
    </div>
    <ProposalsList
      title="Proposals"
      limit="off"
      :loading="!proposalsRecord?.loaded"
      :loading-more="proposalsRecord?.loadingMore"
      :proposals="
        proposalsStore.getSpaceProposals(props.space.id, props.space.network)
      "
      @end-reached="handleEndReached"
    />
  </div>
</template>
