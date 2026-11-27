<script setup lang="ts">
import { VotingRecord } from '@/helpers/stakedVoteDelegation/votingRecord';
import { _rt } from '@/helpers/utils';

defineProps<{
  record?: VotingRecord;
  isLoading: boolean;
  isError: boolean;
}>();
</script>

<template>
  <div class="border rounded-lg overflow-hidden">
    <UiLoading v-if="isLoading && !record" class="block px-3.5 py-3" />
    <UiStateWarning v-else-if="isError" class="px-3.5 py-3">
      Could not load the voting record.
    </UiStateWarning>
    <template v-else-if="record">
      <div
        class="px-3.5 py-2.5 border-b flex items-center justify-between gap-2"
      >
        <span class="text-skin-heading">
          Voted on {{ record.cast }} of the last {{ record.total }}
        </span>
        <StakedDelegationRecordDots :record="record" />
      </div>
      <div
        v-for="entry in record.entries"
        :key="`${entry.proposal.network}:${entry.proposal.id}`"
        class="px-3.5 py-2.5 border-b last:border-b-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3"
      >
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <UiPill class="shrink-0">{{ entry.kind }}</UiPill>
          <AppLink
            :to="{
              name: 'space-proposal-overview',
              params: {
                proposal: entry.proposal.proposal_id,
                space: `${entry.proposal.network}:${entry.proposal.space.id}`
              }
            }"
            class="text-skin-link truncate hover:underline"
          >
            {{ entry.proposal.title || `#${entry.proposal.proposal_id}` }}
          </AppLink>
          <span class="text-skin-text text-sm shrink-0 hidden md:inline">
            {{ _rt(entry.proposal.created) }}
          </span>
        </div>
        <div
          class="sm:w-[220px] shrink-0 sm:text-right truncate text-[16px]"
          :class="
            entry.choice !== null ? 'text-skin-heading' : 'text-skin-text'
          "
          :title="entry.choice ?? undefined"
        >
          {{ entry.choice ?? "Didn't vote" }}
        </div>
      </div>
    </template>
  </div>
</template>
