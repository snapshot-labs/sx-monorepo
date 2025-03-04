<script setup lang="ts">
import { Choice, Proposal as ProposalType } from '@/types';

const props = defineProps<{
  proposal: ProposalType;
  showSpace: boolean;
  showAuthor: boolean;
}>();

const { modalAccountOpen } = useModal();
const { web3 } = useWeb3();
const termsStore = useTermsStore();

const modalOpenVote = ref(false);
const modalOpenTerms = ref(false);
const selectedChoice = ref<Choice | null>(null);

const space = computed(() => ({
  network: props.proposal.network,
  ...props.proposal.space
}));

const handleVoteClick = (choice: Choice) => {
  if (!web3.value.account) {
    modalAccountOpen.value = true;
    return;
  }

  selectedChoice.value = choice;

  if (props.proposal.space.terms && !termsStore.areAccepted(space.value)) {
    modalOpenTerms.value = true;
    return;
  }

  modalOpenVote.value = true;
};

function handleAcceptTerms() {
  termsStore.accept(space.value);
  handleVoteClick(selectedChoice.value!);
}
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
            class="py-2"
            @vote="handleVoteClick"
          />
        </ProposalVote>
      </div>
    </div>
  </div>
  <teleport to="#modal">
    <ModalTerms
      v-if="proposal.space.terms"
      :open="modalOpenTerms"
      :space="proposal.space"
      @close="modalOpenTerms = false"
      @accept="handleAcceptTerms"
    />
    <ModalVote
      v-if="proposal.type === 'basic' && proposal.state === 'active'"
      :choice="selectedChoice"
      :proposal="proposal"
      :open="modalOpenVote"
      @close="modalOpenVote = false"
      @voted="selectedChoice = null"
    />
  </teleport>
</template>
