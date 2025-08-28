<script setup lang="ts">
import { formatQuorum, quorumLabel, quorumProgress } from '@/helpers/quorum';
import { _n, getProposalId, shortenAddress } from '@/helpers/utils';
import { Proposal as ProposalType } from '@/types';

const props = withDefaults(
  defineProps<{
    proposal: ProposalType;
    showSpace?: boolean;
    showAuthor?: boolean;
    showVotedIndicator?: boolean;
  }>(),
  {
    showSpace: true,
    showAuthor: true,
    showVotedIndicator: true
  }
);

const { getTsFromCurrent } = useMetaStore();
const { votes } = useAccount();

const modalOpenTimeline = ref(false);

const totalProgress = computed(() => quorumProgress(props.proposal));

const hasVoted = computed(
  () =>
    props.showVotedIndicator &&
    votes.value[`${props.proposal.network}:${props.proposal.id}`]
);
</script>
<template>
  <div v-bind="$attrs">
    <div class="space-x-2 flex">
      <AppLink
        :to="{
          name: 'space-proposal-overview',
          params: {
            proposal: proposal.proposal_id || proposal.id,
            space: `${proposal.network}:${proposal.space.id}`
          }
        }"
      >
        <ProposalIconStatus size="17" :state="proposal.state" class="top-1.5" />
      </AppLink>
      <div class="min-w-0 my-1 items-center leading-6 space-x-2">
        <AppLink
          v-if="showSpace"
          :to="{
            name: 'space-overview',
            params: {
              space: `${proposal.network}:${proposal.space.id}`
            }
          }"
          class="text-[21px] text-skin-text font-bold inline shrink-0"
        >
          {{ proposal.space.name }}
        </AppLink>
        <AppLink
          :to="{
            name: 'space-proposal-overview',
            params: {
              proposal: proposal.proposal_id || proposal.id,
              space: `${proposal.network}:${proposal.space.id}`
            }
          }"
          class="space-x-2"
        >
          <h3
            class="text-[21px] inline [overflow-wrap:anywhere] min-w-0"
            v-text="proposal.title || `Proposal #${proposal.proposal_id}`"
          />
          <UiTooltip v-if="proposal.isInvalid" title="This proposal is invalid">
            <IH-exclamation
              class="inline-block text-skin-danger shrink-0 relative bottom-0.5"
            />
          </UiTooltip>
          <ProposalLabels
            v-if="proposal.space?.labels && proposal.labels.length"
            :space-id="`${proposal.network}:${proposal.space.id}`"
            :space-labels="proposal.space.labels"
            :labels="proposal.labels"
            inline
            with-link
          />
        </AppLink>
      </div>
    </div>
    <div class="inline">
      {{ getProposalId(proposal) }}
      <template v-if="showAuthor">
        by
        <AppLink
          class="text-skin-text"
          :to="{
            name: 'space-user-statement',
            params: {
              space: `${proposal.network}:${proposal.space.id}`,
              user: proposal.author.id
            }
          }"
        >
          {{ proposal.author.name || shortenAddress(proposal.author.id) }}
          <span
            v-if="proposal.author.role"
            class="bg-skin-border text-skin-link text-[13px] rounded-full px-1.5 py-0.5"
            v-text="proposal.author.role"
          />
        </AppLink>
      </template>
    </div>
    <span>
      <template v-if="proposal.vote_count">
        ·
        <router-link
          class="text-skin-text"
          :to="{
            name: 'space-proposal-votes',
            params: {
              proposal: proposal.proposal_id || proposal.id,
              space: `${proposal.network}:${proposal.space.id}`
            }
          }"
        >
          {{ _n(proposal.vote_count, 'compact') }}
          {{ proposal.vote_count !== 1 ? 'votes' : 'vote' }}
        </router-link>
      </template>
      <span v-if="proposal.quorum" class="lowercase">
        · {{ formatQuorum(totalProgress) }}
        {{ quorumLabel(proposal.quorum_type) }}
      </span>
      ·
      <TimeRelative
        v-slot="{ relativeTime }"
        :time="getTsFromCurrent(props.proposal.network, props.proposal.max_end)"
      >
        <button
          type="button"
          class="text-skin-text"
          @click="modalOpenTimeline = true"
          v-text="relativeTime"
        />
      </TimeRelative>
      <template v-if="hasVoted">
        ·
        <IH-check class="inline-block mt-[-2px]" />
        voted
      </template>
    </span>
  </div>
  <teleport to="#modal">
    <ModalTimeline
      :open="modalOpenTimeline"
      :proposal="proposal"
      @close="modalOpenTimeline = false"
    />
  </teleport>
</template>
