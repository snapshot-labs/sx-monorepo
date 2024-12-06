<script setup lang="ts">
import { _d } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';
import { Space } from '@/types';

type EditModalSettings = {
  open: boolean;
  editProperty: 'start' | 'minEnd';
  min?: number;
  selected: number;
};

const MIN_VOTING_PERIOD = 60;

const customProposalTime = defineModel<{ start?: number; minEnd?: number }>({
  required: true
});

const props = defineProps<{
  space: Space;
  editable: boolean;
  created: number;
  start: number;
  minEnd: number;
  maxEnd: number;
}>();

const { getDurationFromCurrent } = useMetaStore();

const editModalSettings = reactive<EditModalSettings>({
  open: false,
  editProperty: 'start',
  selected: 0
});

const isOffchainSpace = computed(() =>
  offchainNetworks.includes(props.space.network)
);

const minDates = computed(() => {
  return {
    start: props.created,
    minEnd: props.start + MIN_VOTING_PERIOD
  };
});

function handleEditClick(type: 'start' | 'minEnd') {
  editModalSettings.selected = props[type];
  editModalSettings.min = minDates.value[type];
  editModalSettings.editProperty = type;
  editModalSettings.open = true;
}

function handleDatePick(timestamp: number) {
  if (
    editModalSettings.editProperty === 'start' &&
    customProposalTime.value.minEnd &&
    timestamp >= customProposalTime.value.minEnd
  ) {
    const customVotingPeriod = props.minEnd - props.start;
    customProposalTime.value.minEnd = timestamp + customVotingPeriod;
  }

  customProposalTime.value[editModalSettings.editProperty] = timestamp;
}

function formatVotingDuration(
  type: 'voting_delay' | 'min_voting_period' | 'max_voting_period'
): string {
  const duration = getDurationFromCurrent(
    props.space.network,
    props.space[type]
  );
  const roundedDuration = Math.round(duration / 60) * 60;

  return _d(roundedDuration);
}
</script>

<template>
  <div>
    <h4 class="eyebrow mb-2.5" v-text="'Timeline'" />
    <ProposalTimeline
      :data="
        isOffchainSpace || !editable
          ? {
              ...space,
              created,
              start,
              min_end: minEnd,
              max_end: maxEnd
            }
          : space
      "
    >
      <template v-if="editable" #start-date-suffix>
        <UiTooltip
          v-if="space.voting_delay"
          :title="`This space has enforced a ${formatVotingDuration('voting_delay')} voting delay`"
        >
          <IH-exclamation-circle />
        </UiTooltip>
        <button
          v-else-if="isOffchainSpace"
          class="text-skin-link"
          @click="handleEditClick('start')"
          v-text="'Edit'"
        />
      </template>
      <template v-if="editable" #end-date-suffix>
        <UiTooltip
          v-if="space.min_voting_period"
          :title="`This space has enforced a ${formatVotingDuration('min_voting_period')} voting period`"
        >
          <IH-exclamation-circle />
        </UiTooltip>
        <button
          v-else-if="isOffchainSpace"
          class="text-skin-link"
          @click="handleEditClick('minEnd')"
          v-text="'Edit'"
        />
      </template>
      <template v-if="editable && space.min_voting_period" #min_end-date-suffix>
        <UiTooltip
          :title="`This space has enforced a ${formatVotingDuration('min_voting_period')} minimum voting period`"
        >
          <IH-exclamation-circle />
        </UiTooltip>
      </template>
      <template v-if="editable && space.max_voting_period" #max_end-date-suffix>
        <UiTooltip
          :title="`This space has enforced a ${formatVotingDuration('max_voting_period')} maximum voting period`"
        >
          <IH-exclamation-circle />
        </UiTooltip>
      </template>
    </ProposalTimeline>
    <ModalDateTime
      :min="editModalSettings.min"
      :selected="editModalSettings.selected"
      :open="editModalSettings.open"
      @pick="handleDatePick"
      @close="editModalSettings.open = false"
    />
  </div>
</template>
