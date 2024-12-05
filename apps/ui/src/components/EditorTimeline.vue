<script setup lang="ts">
import { _d } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';
import { Space } from '@/types';

const proposalTime = defineModel<{ start: null | number; end: null | number }>({
  required: true
});

const props = defineProps<{
  space: Space;
  editable: boolean;
  proposalStart: number;
  proposalEnd: number;
}>();

const { getDurationFromCurrent } = useMetaStore();

const modalOpenCalendar = ref(false);
const modalCalendarProperty = ref('start');
const modalCalendarTimestamp = ref(0);
const modalCalendarMinTimestamp = ref(0);

const isOffchainSpace = computed(() =>
  offchainNetworks.includes(props.space.network)
);

function handleEditPropositionStartClick() {
  modalCalendarTimestamp.value =
    proposalTime.value.start ?? props.proposalStart;
  modalCalendarMinTimestamp.value = Math.floor(Date.now() / 1000);
  modalCalendarProperty.value = 'start';
  modalOpenCalendar.value = true;
}

function handleEditPropositionEndClick() {
  modalCalendarTimestamp.value = proposalTime.value.end ?? props.proposalEnd;
  modalCalendarMinTimestamp.value =
    (proposalTime.value.start ?? props.proposalStart) + 60;
  modalCalendarProperty.value = 'end';
  modalOpenCalendar.value = true;
}

function handlePropositionTimeUpdate(timestamp: number) {
  if (
    modalCalendarProperty.value === 'start' &&
    proposalTime.value.end &&
    timestamp >= proposalTime.value.end
  ) {
    proposalTime.value.end =
      timestamp + props.proposalEnd - props.proposalStart;
  }

  proposalTime.value[modalCalendarProperty.value] = timestamp;
}

function formatVotingDuration(type: string) {
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
        isOffchainSpace
          ? {
              ...space,
              start: proposalStart,
              min_end: proposalEnd,
              max_end: proposalEnd
            }
          : space
      "
    >
      <template v-if="editable" #start-date-suffix>
        <button
          v-if="!space.voting_delay && isOffchainSpace"
          class="text-skin-link"
          @click="handleEditPropositionStartClick"
        >
          Edit
        </button>
        <UiTooltip
          v-else-if="space.voting_delay"
          :title="`This space has enforced a ${formatVotingDuration('voting_delay')} voting delay`"
        >
          <IH-exclamation-circle />
        </UiTooltip>
      </template>
      <template v-if="editable" #end-date-suffix>
        <button
          v-if="!space.min_voting_period && isOffchainSpace"
          class="text-skin-link"
          @click="handleEditPropositionEndClick"
        >
          Edit
        </button>
        <UiTooltip
          v-else-if="space.min_voting_period"
          :title="`This space has enforced a ${formatVotingDuration('min_voting_period')} voting period`"
        >
          <IH-exclamation-circle />
        </UiTooltip>
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
      :min="modalCalendarMinTimestamp"
      :timestamp="modalCalendarTimestamp"
      :open="modalOpenCalendar"
      @pick="handlePropositionTimeUpdate"
      @close="modalOpenCalendar = false"
    />
  </div>
</template>
