<script setup lang="ts">
import { VotingRecord } from '@/helpers/stakedVoteDelegation/votingRecord';

const props = defineProps<{
  record?: VotingRecord;
  isLoading?: boolean;
}>();

const tooltip = computed(() => {
  if (!props.record) return '';
  return props.record.entries
    .map(
      entry =>
        `${entry.kind}: ${entry.proposal.title || `#${entry.proposal.proposal_id}`} → ${entry.choice ?? "didn't vote"}`
    )
    .join('\n');
});
</script>

<template>
  <UiLoading v-if="isLoading && !record" :size="14" />
  <UiTooltip
    v-else-if="record"
    :title="`Voted on ${record.cast} of the last ${record.total} votes and polls`"
  >
    <span
      class="inline-flex items-center gap-1.5 whitespace-nowrap cursor-default"
      :aria-label="tooltip"
    >
      <span class="inline-flex gap-[3px]">
        <span
          v-for="(entry, i) in record.entries"
          :key="i"
          class="size-[7px] rounded-full"
          :class="entry.choice !== null ? 'bg-skin-link' : 'bg-skin-border'"
        />
      </span>
      <span
        class="text-sm"
        :class="record.cast ? 'text-skin-heading' : 'text-skin-text'"
      >
        {{ record.cast }}/{{ record.total }}
      </span>
    </span>
  </UiTooltip>
  <span v-else class="text-skin-text text-sm">—</span>
</template>
