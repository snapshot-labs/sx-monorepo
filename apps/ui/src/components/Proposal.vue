<script setup lang="ts">
import { ref } from 'vue';
import { _rt, shortenAddress } from '@/helpers/utils';
import { useActions } from '@/composables/useActions';
import { useAccount } from '@/composables/useAccount';
import type { Proposal as ProposalType } from '@/types';

defineProps<{ proposal: ProposalType }>();

const { voted } = useAccount();
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
            params: { id: proposal.proposal_id, space: proposal.space }
          }"
          class="block"
        >
          <h3 v-text="proposal.title || `Proposal #${proposal.proposal_id}`" />
        </router-link>
        <router-link
          :to="{
            name: 'user',
            params: { id: proposal.author }
          }"
        >
          <Stamp :id="proposal.author" :size="24" class="mr-1" />
          {{ shortenAddress(proposal.author) }}
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
        <div v-if="!voted.includes(proposal.id)" class="space-x-2 py-2">
          <UiButton
            class="w-full !text-green !border-green !w-[40px] !h-[40px] !px-0"
            @click="vote(proposal.space, proposal.proposal_id, 1)"
          >
            <IH-check class="inline-block" />
          </UiButton>
          <UiButton
            class="w-full !text-red !border-red !w-[40px] !h-[40px] !px-0"
            @click="vote(proposal.space, proposal.proposal_id, 2)"
          >
            <IH-x class="inline-block" />
          </UiButton>
          <UiButton
            class="w-full !text-gray-500 !border-gray-500 !w-[40px] !h-[40px] !px-0"
            @click="vote(proposal.space, proposal.proposal_id, 3)"
          >
            <IH-arrow-sm-right class="inline-block" />
          </UiButton>
        </div>
        <div v-else class="rounded-full h-[6px] overflow-hidden">
          <div
            v-for="(score, i) in Array(3)"
            :key="i"
            class="choice-bg float-left h-full"
            :style="{
              width: `${(
                (100 / proposal.scores_total) *
                proposal[`scores_${i + 1}`]
              ).toFixed(3)}%`
            }"
            :class="`_${i + 1}`"
          />
        </div>
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
