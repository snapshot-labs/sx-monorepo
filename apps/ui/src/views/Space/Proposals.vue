<script setup lang="ts">
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions
} from '@headlessui/vue';
import { Float } from '@headlessui-float/vue';
import { LocationQueryRaw } from 'vue-router';
import ProposalIconStatus from '@/components/ProposalIconStatus.vue';
import { getOrgProposalLabel } from '@/helpers/organizations';
import { offchainNetworks } from '@/networks';
import { ProposalsFilter } from '@/networks/types';
import { useMultiSpaceProposalsQuery } from '@/queries/proposals';
import { useSpaceVotingPowerQuery } from '@/queries/votingPower';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();
const { organization } = useOrganization();
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

/** Onchain spaces in this org, on the same network as the current space.
 *  Drives the Spaces filter. Gated to Arbitrum for now — the only org with multiple
 *  onchain governors today; revisit when another org needs the same pattern. */
const orgOnchainSpaces = computed(() => {
  if (organization.value?.id !== 'arbitrum') return [];
  const all = organization.value?.spaces ?? [];
  return all.filter(
    s =>
      !offchainNetworks.includes(s.network) &&
      s.network === props.space.network
  );
});

/** Default selection: when the chip is shown (Arbitrum org today), all onchain spaces
 *  are pre-selected so "Onchain voting" surfaces everything at once. Falls back to the
 *  current space for any future org that opts in with a single-space sidebar. */
const defaultSelectedSpaceIds = computed(() =>
  orgOnchainSpaces.value.length
    ? orgOnchainSpaces.value.map(s => s.id)
    : [props.space.id]
);

/** Multi-select: which spaces to aggregate proposals from. Persisted in ?spaces=<csv>;
 *  initialized from the default and overridden by URL state in the watcher below. */
const selectedSpaceIds = ref<string[]>([...defaultSelectedSpaceIds.value]);

const showSpacesFilter = computed(() => orgOnchainSpaces.value.length > 1);

const spacesById = computed(() =>
  Object.fromEntries(orgOnchainSpaces.value.map(s => [s.id, s]))
);

/** Chip label: "Any" when nothing selected, the name when one, "Name +N" when many. */
const spacesButtonLabel = computed(() => {
  const ids = selectedSpaceIds.value;
  if (!ids.length) return 'Any';
  const first = spacesById.value[ids[0]];
  const firstName = first?.name ?? first?.id ?? ids[0];
  return ids.length === 1 ? firstName : `${firstName} +${ids.length - 1}`;
});

const selectIconBaseProps = {
  size: 16
};

const proposalsLabel = computed(() => {
  /** Single space selected (or no org context): keep the existing per-space label. */
  if (selectedSpaceIds.value.length <= 1) {
    return (
      getOrgProposalLabel(
        organization.value,
        `${props.space.network}:${props.space.id}`
      ) ?? 'Proposals'
    );
  }
  return 'Proposals';
});

const spaceLabels = computed(() => {
  if (!props.space.labels) return {};

  return Object.fromEntries(props.space.labels.map(label => [label.id, label]));
});

/** Effective spaces to query — falls back to the current space when the multi-select
 *  is empty (avoids an empty-IN query that would return nothing). */
const effectiveSpaceIds = computed(() =>
  selectedSpaceIds.value.length ? selectedSpaceIds.value : [props.space.id]
);

const {
  data,
  fetchNextPage,
  hasNextPage,
  isPending,
  isError,
  isFetchingNextPage
} = useMultiSpaceProposalsQuery(
  toRef(() => props.space.network),
  effectiveSpaceIds,
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
    () => route.query.labels as string[] | string,
    () => route.query.spaces as string | undefined,
    () => props.space.id,
    () => orgOnchainSpaces.value
  ],
  ([toState, toLabels, toSpaces, , onchainSpaces]) => {
    state.value = ['any', 'active', 'pending', 'closed'].includes(toState)
      ? (toState as NonNullable<ProposalsFilter['state']>)
      : 'any';
    let normalizedLabels = toLabels || [];
    normalizedLabels = Array.isArray(normalizedLabels)
      ? normalizedLabels
      : [normalizedLabels];
    labels.value = normalizedLabels.filter(id => spaceLabels.value[id]);

    const validIds = new Set(onchainSpaces.map(s => s.id));
    const fromQuery = (toSpaces ?? '').split(',').filter(id => validIds.has(id));
    selectedSpaceIds.value = fromQuery.length
      ? fromQuery
      : [...defaultSelectedSpaceIds.value];
  },
  { throttle: 1000, immediate: true }
);

watch(
  [() => props.space.id, state, labels, selectedSpaceIds],
  (
    [toSpaceId, toState, toLabels, toSpaces],
    [fromSpaceId, fromState, fromLabels, fromSpaces]
  ) => {
    if (
      toSpaceId !== fromSpaceId ||
      toState !== fromState ||
      toLabels !== fromLabels ||
      toSpaces !== fromSpaces
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

      /** Drop the param when the selection matches the default (so URLs stay clean
       *  on fresh visits and only show ?spaces= when the user has narrowed). */
      const def = defaultSelectedSpaceIds.value;
      const isDefault =
        toSpaces.length === def.length &&
        toSpaces.every(id => def.includes(id));
      if (toSpaces.length && !isDefault) {
        query.spaces = toSpaces.join(',');
      } else {
        delete query.spaces;
      }

      if (JSON.stringify(query) !== JSON.stringify(route.query)) {
        // NOTE: If we push the same query it will cause scroll position to be reset
        router.push({ query });
      }
    }
  },
  { immediate: true }
);

watchEffect(() => setTitle(`${proposalsLabel.value} - ${props.space.name}`));
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
        <div v-if="showSpacesFilter" class="sm:relative">
          <Listbox v-model="selectedSpaceIds" multiple as="div">
            <Float adaptive-width strategy="fixed" placement="bottom-start">
              <ListboxButton
                class="flex items-center gap-2 relative rounded-full leading-[100%] border button px-3 min-w-[110px] h-[42px] top-1 text-skin-link bg-skin-bg"
              >
                <div
                  class="absolute top-[-10px] bg-skin-bg px-1 left-2.5 text-sm text-skin-text"
                >
                  Spaces
                </div>
                <span class="truncate max-w-[180px]">
                  {{ spacesButtonLabel }}
                </span>
              </ListboxButton>
              <ListboxOptions
                class="mt-2 bg-skin-bg rounded-md shadow-bottom overflow-hidden focus:outline-none min-w-[200px] border"
              >
                <ListboxOption
                  v-for="s in orgOnchainSpaces"
                  :key="s.id"
                  v-slot="{ selected, active }"
                  :value="s.id"
                >
                  <li
                    class="px-3 py-2 cursor-pointer flex items-center gap-2 whitespace-nowrap"
                    :class="active ? 'bg-skin-border' : ''"
                  >
                    <IH-check
                      v-if="selected"
                      class="text-skin-success size-[16px]"
                    />
                    <span v-else class="inline-block size-[16px]" />
                    <span class="text-skin-link">
                      {{ s.name ?? s.id }}
                    </span>
                  </li>
                </ListboxOption>
              </ListboxOptions>
            </Float>
          </Listbox>
        </div>
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
            uniform
          >
            <IH-pencil-alt />
          </UiButton>
        </UiTooltip>
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
    />
  </div>
</template>
