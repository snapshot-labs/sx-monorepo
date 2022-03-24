<script setup>
import { ref } from 'vue';
import { _rt, _n, shortenAddress } from '@/helpers/utils';
import { useActions } from '../composables/useActions';

defineProps({ proposal: Object });

const { vote } = useActions();
const modalOpen = ref(false);
</script>
<template>
  <div>
    <div class="x-block py-4">
      <router-link
        :to="{
          name: 'proposal',
          params: { id: proposal.proposal_id, space: proposal.space }
        }"
      >
        <div class="overflow-hidden mb-3 px-4">
          <Icon name="threedots" size="20" class="float-right" />
          <Stamp :id="proposal.author" :size="24" class="float-left mr-2" />
          <span>
            {{ shortenAddress(proposal.author) }}
            <span class="text-skin-text">· {{ _rt(proposal.created) }}</span>
          </span>
        </div>
        <h2 class="mb-3 px-4">
          {{ proposal.title || `Proposal #${proposal.proposal_id}` }}
        </h2>
      </router-link>
      <div class="space-x-2 mb-3 px-4">
        <UiButton
          @click="vote(proposal.space, proposal.proposal_id, 1)"
          class="w-full !text-green !border-green w-[46px] !px-0"
        >
          <Icon name="check3" size="20" />
        </UiButton>
        <UiButton
          @click="vote(proposal.space, proposal.proposal_id, 2)"
          class="w-full !text-red !border-red w-[46px] !px-0"
        >
          <Icon name="close2" size="20" />
        </UiButton>
        <UiButton
          @click="vote(proposal.space, proposal.proposal_id, 3)"
          class="w-full !text-gray-500 !border-gray-500 w-[46px] !px-0"
        >
          <Icon name="skip" size="20" />
        </UiButton>
      </div>
      <div class="text-skin-text px-4">
        <a @click="modalOpen = true" class="text-skin-text">
          {{ _n(proposal.vote_count) }} votes
        </a>
        ·
        {{ _rt(proposal.end) }}
      </div>
    </div>
    <teleport to="#modal">
      <ModalVotes
        :open="modalOpen"
        :proposal="proposal"
        @close="modalOpen = false"
      />
    </teleport>
  </div>
</template>
