<script setup lang="ts">
import { quorumLabel, quorumProgress } from '@/helpers/quorum';
import { _rt, _n, _p, shortenAddress, getProposalId } from '@/helpers/utils';
import type { Proposal as ProposalType, Choice } from '@/types';

const props = defineProps<{ proposal: ProposalType; showSpace: boolean }>();

const { getTsFromCurrent } = useMetaStore();
const { vote } = useActions();
const { votes } = useAccount();
const modalOpenTimeline = ref(false);
const sendingType = ref<Choice | null>(null);

const totalProgress = computed(() => quorumProgress(props.proposal));

async function handleVoteClick(choice: Choice) {
  sendingType.value = choice;

  try {
    await vote(props.proposal, choice);
  } finally {
    sendingType.value = null;
  }
}
</script>
<template>
  <div>
    <div class="border-b mx-4 py-[14px] flex">
      <div class="flex-auto mr-4 w-0">
        <div class="space-x-2 flex">
          <router-link
            :to="{
              name: 'proposal-overview',
              params: {
                id: proposal.proposal_id,
                space: `${proposal.network}:${proposal.space.id}`
              }
            }"
          >
            <ProposalIconStatus width="17" height="17" :state="proposal.state" class="top-[6px]" />
          </router-link>

          <div class="md:flex md:min-w-0 my-1 items-center leading-6">
            <router-link
              v-if="showSpace"
              :to="{
                name: 'space-overview',
                params: {
                  id: `${proposal.network}:${proposal.space.id}`
                }
              }"
              class="text-[21px] text-skin-text mr-2 font-bold inline shrink-0"
            >
              {{ proposal.space.name }}
            </router-link>

            <router-link
              :to="{
                name: 'proposal-overview',
                params: {
                  id: proposal.proposal_id,
                  space: `${proposal.network}:${proposal.space.id}`
                }
              }"
              class="md:flex md:min-w-0"
            >
              <h3
                class="text-[21px] inline md:truncate md:text-ellipsis mr-2"
                v-text="proposal.title || `Proposal #${proposal.proposal_id}`"
              />
              <IH-check
                v-if="votes[`${proposal.network}:${proposal.id}`]"
                class="text-skin-success inline-block shrink-0 relative top-[-1px] md:top-[2px]"
              />
            </router-link>
          </div>
        </div>
        <div class="inline">
          {{ getProposalId(proposal) }}
          by
          <router-link
            class="text-skin-text"
            :to="{
              name: 'user',
              params: { id: proposal.author.id }
            }"
          >
            {{ proposal.author.name || shortenAddress(proposal.author.id) }}
          </router-link>
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
          <a
            class="text-skin-text"
            @click="modalOpenTimeline = true"
            v-text="_rt(getTsFromCurrent(proposal.network, proposal.max_end))"
          />
        </span>
      </div>
      <div class="hidden md:block">
        <ProposalVote :proposal="proposal">
          <template #unsupported><div /></template>
          <template #waiting><div /></template>
          <template #cancelled><div /></template>
          <template #voted-pending><div /></template>
          <template #voted>
            <ProposalResults v-if="proposal.type === 'basic'" :proposal="proposal" />
            <div v-else />
          </template>
          <template #ended>
            <ProposalResults v-if="proposal.type === 'basic'" :proposal="proposal" />
            <div v-else />
          </template>
          <ProposalVoteBasic
            v-if="proposal.type === 'basic'"
            :sending-type="sendingType"
            :size="40"
            @vote="handleVoteClick"
          />
        </ProposalVote>
      </div>
    </div>
    <teleport to="#modal">
      <ModalTimeline
        :open="modalOpenTimeline"
        :proposal="proposal"
        @close="modalOpenTimeline = false"
      />
    </teleport>
  </div>
</template>
