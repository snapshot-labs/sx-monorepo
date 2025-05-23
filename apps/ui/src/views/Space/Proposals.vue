<script setup lang="ts">
import { LocationQueryRaw } from 'vue-router';
import ProposalIconStatus from '@/components/ProposalIconStatus.vue';
import { ProposalsFilter } from '@/networks/types';
import { useProposalsQuery } from '@/queries/proposals';
import { useSpaceVotingPowerQuery } from '@/queries/votingPower';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();
const router = useRouter();
const route = useRoute();
const { web3 } = useWeb3();
const {
  data: votingPower,
  isPending: isVotingPowerPending,
  isError: isVotingPowerError,
  refetch: fetchVotingPower
} = useSpaceVotingPowerQuery(
  toRef(() => web3.value.account),
  toRef(props, 'space')
);

const state = ref<NonNullable<ProposalsFilter['state']>>('any');
const labels = ref<string[]>([]);

const selectIconBaseProps = {
  size: 16
};

const spaceLabels = computed(() => {
  if (!props.space.labels) return {};

  return Object.fromEntries(props.space.labels.map(label => [label.id, label]));
});

const {
  data,
  fetchNextPage,
  hasNextPage,
  isPending,
  isError,
  isFetchingNextPage
} = useProposalsQuery(
  toRef(() => props.space.network),
  toRef(() => props.space.id),
  {
    state,
    labels
  },
  toRef(() => (route.query.q as string) || '')
);

function handleClearLabelsFilter(close: () => void) {
  labels.value = [];
  close();
}

async function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}

watchThrottled(
  [
    () => route.query.state as string,
    () => route.query.labels as string[] | string
  ],
  ([toState, toLabels]) => {
    state.value = ['any', 'active', 'pending', 'closed'].includes(toState)
      ? (toState as NonNullable<ProposalsFilter['state']>)
      : 'any';
    let normalizedLabels = toLabels || [];
    normalizedLabels = Array.isArray(normalizedLabels)
      ? normalizedLabels
      : [normalizedLabels];
    labels.value = normalizedLabels.filter(id => spaceLabels.value[id]);
  },
  { throttle: 1000, immediate: true }
);

watch(
  [() => props.space.id, state, labels],
  ([toSpaceId, toState, toLabels], [fromSpaceId, fromState, fromLabels]) => {
    if (
      toSpaceId !== fromSpaceId ||
      toState !== fromState ||
      toLabels !== fromLabels
    ) {
      const query: LocationQueryRaw = { ...route.query };

      if (toState === 'any') {
        delete query.state;
      } else {
        query.state = toState;
      }

      if (toLabels.length) {
        query.labels = toLabels;
      } else {
        delete query.labels;
      }

      if (JSON.stringify(query) !== JSON.stringify(route.query)) {
        // NOTE: If we push the same query it will cause scroll position to be reset
        router.push({ query });
      }
    }
  },
  { immediate: true }
);

watchEffect(() => setTitle(`Proposals - ${props.space.name}`));
</script>

<template>
  <div>
    <div
      class="flex justify-between p-4 gap-2 gap-y-3 flex-row"
      :class="{ 'flex-col-reverse sm:flex-row': space.labels?.length }"
    >
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
              componentProps: { ...selectIconBaseProps, state: 'closed' }
            }
          ]"
        />
        <div v-if="space.labels?.length" class="sm:relative">
          <PickerLabel
            v-model="labels"
            :labels="space.labels"
            :button-props="{
              class: [
                'flex items-center gap-2 relative rounded-full leading-[100%] min-w-[75px] max-w-[230px] border button h-[42px] top-1 text-skin-link bg-skin-bg'
              ]
            }"
            :panel-props="{ class: 'sm:min-w-[290px] sm:ml-0 !mt-3' }"
          >
            <template #button="{ close }">
              <div
                class="absolute top-[-10px] bg-skin-bg px-1 left-2.5 text-sm text-skin-text"
              >
                Labels
              </div>
              <div
                v-if="labels.length"
                class="flex gap-1 mx-2.5 overflow-hidden items-center"
              >
                <ul v-if="labels.length" class="flex gap-1 mr-4">
                  <li v-for="id in labels" :key="id">
                    <UiProposalLabel
                      :label="spaceLabels[id].name"
                      :color="spaceLabels[id].color"
                    />
                  </li>
                </ul>
                <div
                  class="flex items-center absolute rounded-r-full right-[1px] pr-2 h-[23px] bg-skin-bg"
                >
                  <div
                    class="block w-2 -ml-2 h-full bg-gradient-to-l from-skin-bg"
                  />
                  <button
                    v-if="labels.length"
                    class="text-skin-text rounded-full hover:text-skin-link"
                    title="Clear all labels"
                    @click.stop="handleClearLabelsFilter(close)"
                    @keydown.enter.stop="handleClearLabelsFilter(close)"
                  >
                    <IH-x-circle size="16" />
                  </button>
                </div>
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
          :is-loading="isVotingPowerPending"
          :is-error="isVotingPowerError"
          @fetch="fetchVotingPower"
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
      :is-error="isError"
      :loading="isPending"
      :loading-more="isFetchingNextPage"
      :proposals="data?.pages.flat() ?? []"
      @end-reached="handleEndReached"
    />
  </div>
</template>
