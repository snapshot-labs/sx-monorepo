<script setup lang="ts">
import { ref } from 'vue';
import { _rt, shortenAddress } from '@/helpers/utils';
import { useActions } from '@/composables/useActions';
import type { Proposal as ProposalType } from '@/types';

defineProps<{ proposal: ProposalType }>();

const { vote } = useActions();
const modalOpenVotes = ref(false);
const modalOpenTimeline = ref(false);
</script>
<template>
  <div>
    <div class="border-b mx-4 py-3 flex">
      <div class="flex-auto">
        <router-link
          :to="{
            name: 'proposal',
            params: { id: proposal.proposal_id, space: proposal.space.id }
          }"
          class="block"
        >
          <h3 v-text="proposal.title || `Proposal #${proposal.proposal_id}`" />
        </router-link>
        <router-link
          :to="{
            name: 'user',
            params: { id: proposal.author.id }
          }"
        >
          <Stamp :id="proposal.author.id" :size="24" class="mr-1" />
          {{ shortenAddress(proposal.author.id) }}
        </router-link>
        <span>
          ·
          <a
            class="text-skin-text"
            @click="modalOpenTimeline = true"
            v-text="_rt(proposal.created)"
          />
        </span>
      </div>
      <div class="hidden md:block">
        <Vote :proposal="proposal">
          <template #unsupported><div /></template>
          <template #voted>
            <Results :proposal="proposal" />
          </template>
          <template #ended>
            <Results :proposal="proposal" />
          </template>
          <div class="space-x-2 py-2">
            <UiButton
              class="w-full !text-green !border-green !w-[40px] !h-[40px] !px-0"
              @click="vote(proposal.space.id, proposal.proposal_id, 1)"
            >
              <IH-check class="inline-block" />
            </UiButton>
            <UiButton
              class="w-full !text-red !border-red !w-[40px] !h-[40px] !px-0"
              @click="vote(proposal.space.id, proposal.proposal_id, 2)"
            >
              <IH-x class="inline-block" />
            </UiButton>
            <UiButton
              class="w-full !text-gray-500 !border-gray-500 !w-[40px] !h-[40px] !px-0"
              @click="vote(proposal.space.id, proposal.proposal_id, 3)"
            >
              <IH-arrow-sm-right class="inline-block" />
            </UiButton>
          </div>
        </Vote>
      </div>
    </div>
    <teleport to="#modal">
      <ModalVotes
        :open="modalOpenVotes"
        :proposal="proposal"
        @close="modalOpenVotes = false"
      />
      <ModalTimeline
        :open="modalOpenTimeline"
        :proposal="proposal"
        @close="modalOpenTimeline = false"
      />
    </teleport>
  </div>
</template>
