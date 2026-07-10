<script setup lang="ts">
import ProposalIconStatus from '@/components/ProposalIconStatus.vue';
import { ANY_SPACE } from '@/composables/useProposalsFilters';
import { ProposalsFilter } from '@/networks/types';
import { SpaceMetadataLabel } from '@/types';

const state = defineModel<NonNullable<ProposalsFilter['state']>>('state', {
  required: true
});
const labels = defineModel<string[]>('labels', { required: true });
const selectedSpaceId = defineModel<string>('selectedSpaceId', {
  default: ANY_SPACE
});

defineProps<{
  /** Spaces filter options; the filter is rendered only when provided */
  spacesItems?: { key: string; label: string }[];
  spaceLabels: Record<string, SpaceMetadataLabel>;
  labelsList?: SpaceMetadataLabel[];
}>();

const selectIconBaseProps = {
  size: 16
};

function handleClearLabelsFilter(close: () => void) {
  labels.value = [];
  close();
}
</script>

<template>
  <div class="flex gap-2">
    <UiSelectDropdown
      v-if="spacesItems"
      v-model="selectedSpaceId"
      title="Spaces"
      gap="12"
      placement="start"
      :items="spacesItems"
    />
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
    <div v-if="labelsList?.length" class="sm:relative">
      <PickerLabel
        v-model="labels"
        :labels="labelsList"
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
</template>
