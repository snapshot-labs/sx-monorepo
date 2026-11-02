<script setup lang="ts">
import { Choice, Proposal } from '@/types';

const BASIC_CHOICES = ['for', 'against', 'abstain'] as const;

defineProps<{
  proposal: Proposal;
  defaultChoice?: Choice;
  /** Renders basic proposals as a labeled list instead of icon buttons */
  list?: boolean;
}>();

const emit = defineEmits<{
  (e: 'vote', value: Choice): void;
}>();
</script>

<template>
  <ProposalVoteBasic
    v-if="proposal.type === 'basic' && !list"
    :choices="proposal.choices"
    @vote="emit('vote', $event)"
  />
  <ProposalVoteSingleChoice
    v-else-if="['basic', 'single-choice'].includes(proposal.type)"
    :proposal="proposal"
    :default-choice="defaultChoice"
    @vote="
      emit(
        'vote',
        proposal.type === 'basic' ? BASIC_CHOICES[$event - 1] : $event
      )
    "
  />
  <ProposalVoteApproval
    v-else-if="proposal.type === 'approval'"
    :proposal="proposal"
    :default-choice="defaultChoice"
    @vote="emit('vote', $event)"
  />
  <ProposalVoteRankedChoice
    v-else-if="['ranked-choice', 'copeland'].includes(proposal.type)"
    :proposal="proposal"
    :default-choice="defaultChoice"
    @vote="emit('vote', $event)"
  />
  <ProposalVoteWeighted
    v-else-if="['weighted', 'quadratic'].includes(proposal.type)"
    :proposal="proposal"
    :default-choice="defaultChoice"
    @vote="emit('vote', $event)"
  />
</template>
