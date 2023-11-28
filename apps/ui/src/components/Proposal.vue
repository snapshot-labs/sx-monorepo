<script setup lang="ts">
import { _rt, _n, shortenAddress, getProposalId } from '@/helpers/utils';
import type { Proposal as ProposalType, Choice } from '@/types';

const props = defineProps<{ proposal: ProposalType }>();

const { getTsFromCurrent } = useMetaStore();
const route = useRoute();
const { vote } = useActions();
const modalOpenTimeline = ref(false);
const sendingType = ref<null | number>(null);

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
    <div class="border-b mx-4 py-2.5 flex">
      <div class="flex-auto mr-4 w-0">
        <router-link
          :to="{
            name: 'proposal-overview',
            params: {
              id: proposal.proposal_id,
              space: `${route.params.id}`
            }
          }"
          class="space-x-2 flex"
        >
          <ProposalStatusIcon width="17" height="17" :state="proposal.state" class="top-[7.5px]" />
          <h3
            class="leading-6 my-1 text-[21px] md:truncate md:text-ellipsis"
            v-text="proposal.title || `Proposal #${proposal.proposal_id}`"
          />
        </router-link>
        <div class="inline">
          {{ getProposalId(proposal) }}
          by
          <router-link
            class="text-skin-text"
            :to="{
              name: 'user',
              params: { id: `${proposal.network}:${proposal.author.id}` }
            }"
          >
            {{ shortenAddress(proposal.author.id) }}
          </router-link>
        </div>
        <span>
          <template v-if="proposal.vote_count">
            · {{ _n(proposal.vote_count, 'compact') }}
            {{ proposal.vote_count !== 1 ? 'votes' : 'vote' }}
          </template>
          ·
          <a
            class="text-skin-text"
            @click="modalOpenTimeline = true"
            v-text="_rt(getTsFromCurrent(proposal.network, proposal.max_end))"
          />
        </span>
      </div>
      <div class="hidden md:block">
        <Vote :proposal="proposal">
          <template #unsupported><div /></template>
          <template #waiting><div /></template>
          <template #cancelled><div /></template>
          <template #voted-pending><div /></template>
          <template #voted>
            <Results v-if="proposal.type === 'basic'" :proposal="proposal" />
            <div v-else />
          </template>
          <template #ended>
            <Results v-if="proposal.type === 'basic'" :proposal="proposal" />
            <div v-else />
          </template>
          <div class="flex space-x-2 py-2">
            <UiTooltip title="For">
              <UiButton
                class="w-full !text-green !border-green !w-[40px] !h-[40px] !px-0"
                :loading="sendingType === 1"
                @click="handleVoteClick(1)"
              >
                <IH-check class="inline-block" />
              </UiButton>
            </UiTooltip>
            <UiTooltip title="Against">
              <UiButton
                class="w-full !text-red !border-red !w-[40px] !h-[40px] !px-0"
                :loading="sendingType === 2"
                @click="handleVoteClick(2)"
              >
                <IH-x class="inline-block" />
              </UiButton>
            </UiTooltip>
            <UiTooltip title="Abstain">
              <UiButton
                class="w-full !text-gray-500 !border-gray-500 !w-[40px] !h-[40px] !px-0"
                :loading="sendingType === 3"
                @click="handleVoteClick(3)"
              >
                <IH-minus-sm class="inline-block" />
              </UiButton>
            </UiTooltip>
          </div>
        </Vote>
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
