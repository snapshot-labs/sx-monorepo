<script setup lang="ts">
import ProposalIconStatus from '@/components/ProposalIconStatus.vue';
import { ProposalsFilter } from '@/networks/types';
import { Space } from '@/types';

const MAX_SHOWN_LABELS_FILTER = 2;

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();
const {
  votingPower,
  fetch: fetchVotingPower,
  reset: resetVotingPower
} = useVotingPower();
const { web3 } = useWeb3();
const router = useRouter();
const route = useRoute();
const proposalsStore = useProposalsStore();

const state = ref<NonNullable<ProposalsFilter['state']>>(
  (route.query?.state as ProposalsFilter['state']) || 'any'
);
const labels = ref<string[]>((route.query['labels[]'] as string[]) || []);

const selectIconBaseProps = {
  size: 16
};

const proposalsRecord = computed(
  () => proposalsStore.proposals[`${props.space.network}:${props.space.id}`]
);

const spaceLabels = computed(() => {
  if (!props.space.labels) return {};

  return Object.fromEntries(props.space.labels.map(label => [label.id, label]));
});

function handleClearLabelsFilter() {
  labels.value = [];
}

async function handleEndReached() {
  if (!proposalsRecord.value?.hasMoreProposals) return;

  proposalsStore.fetchMore(props.space.id, props.space.network);
}

function handleFetchVotingPower() {
  fetchVotingPower(props.space);
}

watch(
  [props.space, state, labels],
  ([toSpace, toState, toLabels], [fromSpace, fromState, fromLabels]) => {
    if (
      toSpace.id !== fromSpace?.id ||
      toState !== fromState ||
      toLabels !== fromLabels
    ) {
      proposalsStore.reset(toSpace.id, toSpace.network);
      proposalsStore.fetch(toSpace.id, toSpace.network, toState, toLabels);
      console.log(route.query);
      const query: any = {
        ...route.query,
        state: toState,
        'labels[]': toLabels
      };
      if (toState === 'any') {
        delete query.state;
      }
      if (!toLabels.length) {
        delete query['labels[]'];
      }
      router.push({ query });
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
    <div class="flex justify-between p-4 gap-2">
      <div class="flex gap-2">
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

        <div v-if="space.labels?.length" class="relative shrink-1">
          <PickerLabel
            v-model="labels"
            :labels="space.labels"
            :button-props="{
              class:
                'flex items-center gap-2 relative rounded-full leading-[100%] border button min-w-[76px] h-[42px] top-1 text-skin-link bg-skin-bg'
            }"
            :panel-props="{ class: 'min-w-[290px] !mx-0 !mt-3' }"
          >
            <template #button>
              <div
                class="absolute top-[-10px] bg-skin-bg px-1 left-2.5 text-sm text-skin-text"
              >
                Labels
              </div>
              <div v-if="labels.length" class="flex gap-2 px-2.5 items-center">
                <ul v-if="labels.length" class="flex gap-1">
                  <li
                    v-for="id in labels.slice(0, MAX_SHOWN_LABELS_FILTER)"
                    :key="id"
                  >
                    <UiProposalLabel
                      :label="spaceLabels[id].name"
                      :color="spaceLabels[id].color"
                    />
                  </li>
                </ul>
                <div
                  v-if="labels.length > MAX_SHOWN_LABELS_FILTER"
                  class="bg-gradient-to-l via-skin-bg from-skin-bg text-skin-link py-2 pl-4 -ml-6"
                >
                  +{{ labels.length - MAX_SHOWN_LABELS_FILTER }}
                </div>
                <button
                  v-if="labels.length"
                  class="text-skin-text rounded-full hover:text-skin-link"
                  title="Clear all labels filter"
                  @click.stop="handleClearLabelsFilter"
                  @keydown.enter="handleClearLabelsFilter"
                >
                  <IH-x-circle size="16" />
                </button>
              </div>
              <span v-else class="px-3 text-skin-link">Any</span>
            </template>
          </PickerLabel>
        </div>
      </div>
      <div class="flex gap-2 truncate">
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
