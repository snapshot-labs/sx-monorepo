<script setup lang="ts">
import { quorumLabel, quorumProgress } from '@/helpers/quorum';
import { _n, _p, _rt, getProposalId, shortenAddress } from '@/helpers/utils';
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
const spacesStore = useSpacesStore();
const { votes } = useAccount();
const modalOpenTimeline = ref(false);

const totalProgress = computed(() => quorumProgress(props.proposal));
const space = computed(() =>
  spacesStore.spacesMap.get(
    `${props.proposal.network}:${props.proposal.space.id}`
  )
);
</script>
<template>
  <div v-bind="$attrs">
    <div class="space-x-2 flex">
      <AppLink
        :to="{
          name: 'space-proposal-overview',
          params: {
            proposal: proposal.proposal_id,
            space: `${proposal.network}:${proposal.space.id}`
          }
        }"
      >
        <ProposalIconStatus size="17" :state="proposal.state" class="top-1.5" />
      </AppLink>

      <div class="min-w-0 my-1 items-center leading-6">
        <AppLink
          v-if="showSpace"
          :to="{
            name: 'space-overview',
            params: {
              space: `${proposal.network}:${proposal.space.id}`
            }
          }"
          class="text-[21px] text-skin-text mr-2 font-bold inline shrink-0"
        >
          {{ proposal.space.name }}
        </AppLink>

        <AppLink
          :to="{
            name: 'space-proposal-overview',
            params: {
              proposal: proposal.proposal_id,
              space: `${proposal.network}:${proposal.space.id}`
            }
          }"
        >
          <h3
            class="text-[21px] inline [overflow-wrap:anywhere] mr-2 min-w-0"
            v-text="proposal.title || `Proposal #${proposal.proposal_id}`"
          />
          <ProposalLabels
            v-if="space?.labels && proposal.labels.length"
            :proposal-labels="proposal.labels"
            :space-labels="space.labels"
            inline
          />
          <IH-check
            v-if="
              showVotedIndicator && votes[`${proposal.network}:${proposal.id}`]
            "
            class="text-skin-success inline-block shrink-0 relative"
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
        </AppLink>
      </template>
    </div>
    <span>
      <template v-if="proposal.vote_count">
        · {{ _n(proposal.vote_count, 'compact') }}
        {{ proposal.vote_count !== 1 ? 'votes' : 'vote' }}
      </template>
      <span v-if="proposal.quorum" class="lowercase">
        · {{ _p(totalProgress) }} {{ quorumLabel(proposal.quorum_type) }}
      </span>
      ·
      <button
        type="button"
        class="text-skin-text"
        @click="modalOpenTimeline = true"
        v-text="_rt(getTsFromCurrent(proposal.network, proposal.max_end))"
      />
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
