<script setup lang="ts">
import { Choice, Proposal as ProposalType } from '@/types';

defineProps<{
  proposal: ProposalType;
  showSpace: boolean;
  showAuthor: boolean;
}>();

const { modalAccountOpen } = useModal();
const { web3 } = useWeb3();

const modalOpenVote = ref(false);
const selectedChoice = ref<Choice | null>(null);

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
      <ProposalsListItemHeading
        :proposal="proposal"
        :show-author="showAuthor"
        :show-space="showSpace"
        class="flex-auto mr-4 w-0"
      />
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
            :choices="proposal.choices"
            :size="40"
            @vote="handleVoteClick"
          />
        </ProposalVote>
      </div>
    </div>
  </div>
  <teleport to="#modal">
    <ModalVote
      :choice="selectedChoice"
      :proposal="proposal"
      :open="modalOpenVote"
      @close="modalOpenVote = false"
      @voted="selectedChoice = null"
    />
  </teleport>
</template>
