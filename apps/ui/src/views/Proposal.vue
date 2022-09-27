<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { sanitizeUrl } from '@braintree/sanitize-url';
import { useProposalsStore } from '@/stores/proposals';
import { _rt, _n, shortenAddress, getUrl } from '@/helpers/utils';
import { useActions } from '@/composables/useActions';
import txs from '@/helpers/execution.json';

const route = useRoute();
const proposalsStore = useProposalsStore();
const { vote } = useActions();
const id = parseInt((route.params.id as string) || '0');
const space = route.params.space as string;
const modalOpenVotes = ref(false);
const modalOpenTimeline = ref(false);

const proposal = computed(() => proposalsStore.getProposal(space, id));

const discussion = computed(() => {
  if (!proposal.value?.discussion) return null;

  const output = sanitizeUrl(proposal.value.discussion);
  if (output === 'about:blank') return null;

  return output;
});

onMounted(() => {
  proposalsStore.fetchProposal(space, id);
});
</script>

<template>
  <div>
    <Container v-if="!proposal" class="pt-5">
      <UiLoading />
    </Container>
    <div v-else>
      <Container class="pt-5">
        <h1 class="mb-3">
          {{ proposal.title || `Proposal #${proposal.proposal_id}` }}
        </h1>
        <div class="flex mb-4 items-center">
          <div class="flex-auto space-x-2">
            <router-link
              :to="{
                name: 'user',
                params: { id: proposal.author.id }
              }"
            >
              <Stamp :id="proposal.author.id" :size="24" class="mr-1" />
              {{ shortenAddress(proposal.author.id) }}
            </router-link>
            <span
              >·
              <a
                class="text-skin-text"
                @click="modalOpenTimeline = true"
                v-text="_rt(proposal.created)"
              />
            </span>
          </div>
          <a :href="sanitizeUrl(getUrl(proposal.metadata_uri))" target="_blank">
            <UiButton class="!w-[46px] !h-[46px] !px-[12px]">
              <IH-dots-horizontal />
            </UiButton>
          </a>
        </div>
        <div v-if="proposal.body" class="mb-4">
          <p v-text="proposal.body" />
        </div>
      </Container>
      <Container class="space-y-4 mb-4" slim>
        <BlockExecution :txs="txs" />
        <a
          v-if="discussion"
          :href="discussion"
          target="_blank"
          class="x-block block mb-5"
        >
          <h4 class="px-4 py-3">
            <IH-chat-alt class="inline-block mr-2" /> Discussion
            <IH-external-link class="float-right mt-1" />
          </h4>
          <Preview
            :url="discussion"
            class="!border-0 !border-t !rounded-none"
          />
        </a>
      </Container>
      <Container>
        <div class="grid grid-cols-3 gap-2 mb-3">
          <UiButton
            class="w-full !text-white !bg-green !border-green"
            @click="vote(space, proposal.proposal_id, 1)"
          >
            <IH-check class="inline-block" />
          </UiButton>
          <UiButton
            class="w-full !text-white !bg-red !border-red"
            @click="vote(space, proposal.proposal_id, 2)"
          >
            <IH-x class="inline-block" />
          </UiButton>
          <UiButton
            class="w-full !text-white !bg-gray-500 !border-gray-500"
            @click="vote(space, proposal.proposal_id, 3)"
          >
            <IH-arrow-right class="inline-block" />
          </UiButton>
        </div>
        <div>
          <a class="text-skin-text" @click="modalOpenVotes = true">
            {{ _n(proposal.vote_count) }} votes
          </a>
          ·
          <a
            class="text-skin-text"
            @click="modalOpenTimeline = true"
            v-text="_rt(proposal.max_end)"
          />
        </div>
      </Container>
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
