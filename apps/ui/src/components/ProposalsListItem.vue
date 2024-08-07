<script setup lang="ts">
import { quorumLabel, quorumProgress } from '@/helpers/quorum';
import { _n, _p, _rt, getProposalId, shortenAddress } from '@/helpers/utils';
import { Choice, Proposal as ProposalType } from '@/types';

const props = defineProps<{ proposal: ProposalType; showSpace: boolean }>();

const { getTsFromCurrent } = useMetaStore();
const { modalAccountOpen } = useModal();
const { web3 } = useWeb3();

const { votes } = useAccount();
const modalOpenTimeline = ref(false);
const modalOpenVote = ref(false);
const selectedChoice = ref<Choice | null>(null);

const totalProgress = computed(() => quorumProgress(props.proposal));

const handleVoteClick = (choice: Choice) => {
  if (!web3.value.account) {
    modalAccountOpen.value = true;
    return;
  }

  selectedChoice.value = choice;
  modalOpenVote.value = true;
};
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
            <ProposalIconStatus
              width="17"
              height="17"
              :state="proposal.state"
              class="top-1.5"
            />
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
                class="text-[21px] inline md:truncate mr-2"
                v-text="proposal.title || `Proposal #${proposal.proposal_id}`"
              />
              <IH-check
                v-if="votes[`${proposal.network}:${proposal.id}`]"
                class="text-skin-success inline-block shrink-0 relative top-[-1px] md:top-0.5"
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
              name: 'space-user-statement',
              params: {
                id: `${proposal.network}:${proposal.space.id}`,
                user: proposal.author.id
              }
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
          <button
            type="button"
            class="text-skin-text"
            @click="modalOpenTimeline = true"
            v-text="_rt(getTsFromCurrent(proposal.network, proposal.max_end))"
          />
        </span>
      </div>
      <div class="hidden md:block">
        <ProposalVote :proposal="proposal">
          <template #wrong-safe-network><div /></template>
          <template #unsupported><div /></template>
          <template #waiting><div /></template>
          <template #cancelled><div /></template>
          <template #voted-pending><div /></template>
          <template #voted>
            <ProposalResults
              v-if="proposal.type === 'basic'"
              :proposal="proposal"
            />
            <div v-else />
          </template>
          <template #ended>
            <ProposalResults
              v-if="proposal.type === 'basic'"
              :proposal="proposal"
            />
            <div v-else />
          </template>
          <ProposalVoteBasic
            v-if="proposal.type === 'basic'"
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
      <ModalVote
        :choice="selectedChoice"
        :proposal="proposal"
        :open="modalOpenVote"
        @close="modalOpenVote = false"
        @voted="selectedChoice = null"
      />
    </teleport>
  </div>
</template>
