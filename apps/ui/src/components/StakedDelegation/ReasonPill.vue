<script setup lang="ts">
import { ResolutionReason } from '@/helpers/stakedVoteDelegation';

const props = defineProps<{ reason: ResolutionReason }>();

const REASONS: Record<
  ResolutionReason,
  { label: string; tooltip: string; variant: 'default' | 'primary' }
> = {
  explicit: {
    label: 'Your choice',
    tooltip: 'You registered this delegate in the registry.',
    variant: 'primary'
  },
  validator: {
    label: 'Default',
    tooltip: 'You have not made a choice, so your validator votes for you.',
    variant: 'default'
  },
  'vote-receiver': {
    label: 'Default · vote receiver',
    tooltip:
      'You have not made a choice. Your validator named this address to vote for it.',
    variant: 'default'
  },
  declined: {
    label: 'Validator declined',
    tooltip:
      'Your validator does not accept default delegations, so you keep your vote.',
    variant: 'default'
  },
  'self-stake': {
    label: 'Self-stake',
    tooltip: "The validator's own stake.",
    variant: 'default'
  }
};

const item = computed(() => REASONS[props.reason]);
</script>

<template>
  <UiTooltip :title="item.tooltip">
    <UiPill :variant="item.variant" class="whitespace-nowrap cursor-default">
      {{ item.label }}
    </UiPill>
  </UiTooltip>
</template>
