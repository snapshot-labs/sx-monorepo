<script setup lang="ts">
import { GOVERNANCE_SPACES } from '@/helpers/stakedVoteDelegation';
import { _rt } from '@/helpers/utils';
import { useProposalsSummaryQuery } from '@/queries/proposals';
import { Proposal } from '@/types';

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

function kindOf(proposal: Proposal) {
  return proposal.network === voteSpace.network
    ? voteSpace.kind
    : pollSpace.kind;
}

const all = computed(() => [...(votes.value ?? []), ...(polls.value ?? [])]);

const live = computed(() =>
  all.value
    .filter(p => p.state === 'active' || p.state === 'pending')
    .sort((a, b) => a.max_end - b.max_end)
);

const lastEnded = computed(
  () =>
    all.value
      .filter(p => p.state !== 'active' && p.state !== 'pending')
      .sort((a, b) => b.max_end - a.max_end)[0] ?? null
);
</script>

<template>
  <div class="border rounded-lg overflow-hidden">
    <div class="px-3.5 py-3 border-b flex items-center gap-2">
      <IH-clock class="text-skin-text shrink-0" />
      <h4 class="text-skin-heading">When your choice counts</h4>
    </div>
    <UiLoading v-if="isLoading" class="block px-3.5 py-3" />
    <template v-else>
      <div
        v-for="proposal in live"
        :key="`${proposal.network}:${proposal.id}`"
        class="px-3.5 py-3 border-b flex items-start gap-2.5"
      >
        <ProposalIconStatus
          :state="proposal.state"
          :size="17"
          class="mt-[3px] shrink-0"
        />
        <div class="min-w-0 flex-1 flex flex-col gap-0.5">
          <div class="flex items-center gap-2 min-w-0">
            <UiPill class="shrink-0">{{ kindOf(proposal) }}</UiPill>
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
          </div>
          <div class="text-skin-text text-[15px]">
            Snapshot taken {{ _rt(proposal.created) }} ·
            {{ proposal.state === 'pending' ? 'starts' : 'ends' }}
            {{
              _rt(
                proposal.state === 'pending' ? proposal.start : proposal.max_end
              )
            }}. Changes you make now won't count for this one.
          </div>
        </div>
      </div>
      <div class="px-3.5 py-3 text-[16px] leading-6 flex flex-col gap-1">
        <span class="text-skin-heading">
          {{
            live.length
              ? 'Changes you make now count from the next proposal.'
              : 'No vote or poll is open. Changes you make now count for the next one.'
          }}
        </span>
        <span class="text-skin-text text-[15px]">
          Voting power is fixed when a proposal is created, from the staking
          contract and this registry at that moment.
          <template v-if="!live.length && lastEnded">
            Last: “{{ lastEnded.title }}” ({{
              kindOf(lastEnded).toLowerCase()
            }}), ended {{ _rt(lastEnded.max_end) }}.
          </template>
        </span>
      </div>
    </template>
  </div>
</template>
