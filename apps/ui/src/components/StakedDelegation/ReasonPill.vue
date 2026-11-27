<script setup lang="ts">
import { ResolutionReason } from '@/helpers/stakedVoteDelegation';

const props = defineProps<{
  reason: ResolutionReason;
  /** First person ("you") on your own stake, third person in Look up. */
  isOwn?: boolean;
}>();

type Copy = { label: string; tooltip: string };

const REASONS: Record<
  ResolutionReason,
  { own: Copy; other: Copy; variant: 'default' | 'primary' }
> = {
  explicit: {
    own: {
      label: 'Your choice',
      tooltip: 'You registered this delegate in the registry.'
    },
    other: {
      label: 'Their choice',
      tooltip: 'This address registered this delegate in the registry.'
    },
    variant: 'primary'
  },
  validator: {
    own: {
      label: 'Default',
      tooltip: 'You have not made a choice, so your validator votes for you.'
    },
    other: {
      label: 'Default',
      tooltip: 'No choice registered, so the validator votes with this stake.'
    },
    variant: 'default'
  },
  'vote-receiver': {
    own: {
      label: 'Default · vote receiver',
      tooltip:
        'You have not made a choice. Your validator named this address to vote for it.'
    },
    other: {
      label: 'Default · vote receiver',
      tooltip:
        'No choice registered. The validator named this address to vote for it.'
    },
    variant: 'default'
  },
  declined: {
    own: {
      label: 'Validator declined',
      tooltip:
        'Your validator does not accept default delegations, so you keep your vote.'
    },
    other: {
      label: 'Validator declined',
      tooltip:
        'The validator does not accept default delegations, so this address keeps its vote.'
    },
    variant: 'default'
  },
  'self-stake': {
    own: { label: 'Self-stake', tooltip: "The validator's own stake." },
    other: { label: 'Self-stake', tooltip: "The validator's own stake." },
    variant: 'default'
  }
};

const item = computed(() => {
  const entry = REASONS[props.reason];
  return { ...(props.isOwn ? entry.own : entry.other), variant: entry.variant };
});
</script>

<template>
  <UiTooltip :title="item.tooltip">
    <UiPill :variant="item.variant" class="whitespace-nowrap cursor-default">
      {{ item.label }}
    </UiPill>
  </UiTooltip>
</template>
