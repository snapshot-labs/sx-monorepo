<script setup lang="ts">
import { GOVERNANCE_SPACES } from '@/helpers/stakedVoteDelegation';
import { _rt } from '@/helpers/utils';
import { useProposalsSummaryQuery } from '@/queries/proposals';

const [voteSpace, pollSpace] = GOVERNANCE_SPACES;

const { data: votes, isPending: isVotesPending } = useProposalsSummaryQuery(
  voteSpace.network,
  voteSpace.id
);
const { data: polls, isPending: isPollsPending } = useProposalsSummaryQuery(
  pollSpace.network,
  pollSpace.id
);

const isLoading = computed(() => isVotesPending.value || isPollsPending.value);

const live = computed(() =>
  [...(votes.value ?? []), ...(polls.value ?? [])]
    .filter(p => p.state === 'active' || p.state === 'pending')
    .sort((a, b) => a.max_end - b.max_end)
);

const TOOLTIP =
  'Voting power is fixed when a proposal is created, from the staking contract and this registry at that moment.';
</script>

<template>
  <UiLoading v-if="isLoading" :size="14" />
  <div v-else class="flex flex-col gap-1 text-[15px] leading-[22px]">
    <div
      v-for="proposal in live"
      :key="`${proposal.network}:${proposal.id}`"
      class="flex items-center gap-1.5 min-w-0"
    >
      <ProposalIconStatus :state="proposal.state" :size="15" class="shrink-0" />
      <span class="text-skin-text shrink-0">
        {{ proposal.network === voteSpace.network ? 'Vote' : 'Poll' }}
        {{ proposal.state === 'pending' ? 'starting' : 'open' }}:
      </span>
      <AppLink
        :to="{
          name: 'space-proposal-overview',
          params: {
            proposal: proposal.proposal_id,
            space: `${proposal.network}:${proposal.space.id}`
          }
        }"
        class="text-skin-link truncate hover:underline"
      >
        {{ proposal.title || `#${proposal.proposal_id}` }}
      </AppLink>
      <span class="text-skin-text shrink-0 hidden sm:inline">
        · ends {{ _rt(proposal.max_end) }}
      </span>
    </div>
    <div class="flex items-center gap-1.5 text-skin-text">
      <IH-clock class="shrink-0" />
      <span>
        {{
          live.length
            ? 'Changes you make now count from the next proposal, not the open one.'
            : 'No vote or poll is open. Changes you make now count for the next one.'
        }}
      </span>
      <UiTooltip :title="TOOLTIP">
        <IH-information-circle class="shrink-0" />
      </UiTooltip>
    </div>
  </div>
</template>
