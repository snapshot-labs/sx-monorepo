<script setup>
import { ref } from 'vue';
import { _rt, _n, shortenAddress } from '@/helpers/utils';
import { useActions } from '@/composables/useActions';
import { useAccount } from '@/composables/useAccount';

defineProps({ proposal: Object });

const { voted } = useAccount();
const { vote } = useActions();
const modalOpenVotes = ref(false);
const modalOpenTimeline = ref(false);
</script>
<template>
  <div>
    <div class="x-block py-4">
      <div class="overflow-hidden px-4">
        <IH-dots-horizontal class="float-right" />
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
          <a @click="modalOpenTimeline = true" class="text-skin-text">
            {{ _rt(proposal.created) }}
          </a>
        </span>
      </div>
      <router-link
        :to="{
          name: 'proposal',
          params: { id: proposal.proposal_id, space: proposal.space }
        }"
        class="py-3 px-4 block"
      >
        <h2 v-text="proposal.title || `Proposal #${proposal.proposal_id}`" />
      </router-link>
      <div v-if="!voted.includes(proposal.id)" class="space-x-2 mb-3 px-4">
        <UiButton
          @click="vote(proposal.space, proposal.proposal_id, 1)"
          class="w-full !text-green !border-green w-[46px] !px-0"
        >
          <IH-check class="inline-block" />
        </UiButton>
        <UiButton
          @click="vote(proposal.space, proposal.proposal_id, 2)"
          class="w-full !text-red !border-red w-[46px] !px-0"
        >
          <IH-x class="inline-block" />
        </UiButton>
        <UiButton
          @click="vote(proposal.space, proposal.proposal_id, 3)"
          class="w-full !text-gray-500 !border-gray-500 w-[46px] !px-0"
        >
          <IH-arrow-sm-right class="inline-block" />
        </UiButton>
      </div>
      <div v-else class="px-4 mb-3">
        <div class="rounded-full h-[6px] overflow-hidden">
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
      <div class="text-skin-text px-4">
        <a @click="modalOpenVotes = true" class="text-skin-text">
          {{ _n(proposal.vote_count) }} votes
        </a>
        ·
        <a @click="modalOpenTimeline = true" class="text-skin-text">
          {{ _rt(proposal.end) }}
        </a>
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
