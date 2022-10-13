<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { sanitizeUrl } from '@braintree/sanitize-url';
import { useProposalsStore } from '@/stores/proposals';
import { _rt, _n, shortenAddress, getUrl } from '@/helpers/utils';
import { useActions } from '@/composables/useActions';
import type { Transaction } from '@/types';

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

const execution = computed(() => {
  const rawExecution = proposal.value?.execution;
  if (!rawExecution) return null;

  let parsed = null;
  try {
    parsed = JSON.parse(rawExecution);
  } catch (err) {
    console.log('failed to parse execution');
  }

  if (!parsed || !Array.isArray(parsed)) return null;

  return parsed as Transaction[];
});

onMounted(() => {
  proposalsStore.fetchProposal(space, id);
});
</script>

<template>
  <div>
    <Container class="pt-5">
      <UiLoading v-if="!proposal" />
      <div v-else>
        <div>
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
            <a
              :href="sanitizeUrl(getUrl(proposal.metadata_uri))"
              target="_blank"
            >
              <UiButton class="!w-[46px] !h-[46px] !px-[12px]">
                <IH-dots-horizontal />
              </UiButton>
            </a>
          </div>
          <div v-if="proposal.body" class="mb-4">
            <p v-text="proposal.body" />
          </div>
        </div>

        <div v-if="discussion">
          <h4 class="mb-3 eyebrow flex items-center">
            <IH-chat-alt class="inline-block mr-2" />
            <span>Discussion</span>
          </h4>
          <a :href="discussion" target="_blank" class="block mb-5">
            <Preview :url="discussion" />
          </a>
        </div>
        <div v-if="execution && execution.length > 0">
          <h4 class="mb-3 eyebrow">Execution</h4>
          <div class="mb-4">
            <BlockExecution :txs="execution" />
          </div>
        </div>
        <div>
          <Vote :proposal="proposal">
            <template #voted="{ vote: userVote }">
              <h4 class="mb-3 eyebrow flex items-center">
                <IH-chart-bar class="inline-block mr-2" />
                <span>Results</span>
              </h4>
              <Results :proposal="proposal" width="full" />
              <div class="mt-2">
                <div v-if="userVote.choice === 1">
                  You already voted <strong>for</strong> this proposal
                </div>
                <div v-else-if="userVote.choice === 2">
                  You already voted <strong>against</strong> this proposal
                </div>
                <div v-else-if="userVote.choice === 3">
                  You already <strong>abstained</strong> from voting on this
                  proposal
                </div>
              </div>
            </template>
            <template #ended>
              <h4 class="mb-3 eyebrow flex items-center">
                <IH-chart-bar class="inline-block mr-2" />
                <span>Results</span>
              </h4>
              <Results :proposal="proposal" width="full" />
            </template>
            <div class="grid grid-cols-3 gap-2">
              <UiButton
                class="w-full !text-white !bg-green !border-green"
                @click="vote(proposal, 1)"
              >
                <IH-check class="inline-block" />
              </UiButton>
              <UiButton
                class="w-full !text-white !bg-red !border-red"
                @click="vote(proposal, 2)"
              >
                <IH-x class="inline-block" />
              </UiButton>
              <UiButton
                class="w-full !text-white !bg-gray-500 !border-gray-500"
                @click="vote(proposal, 3)"
              >
                <IH-arrow-right class="inline-block" />
              </UiButton>
            </div>
          </Vote>
          <div class="mt-3">
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
        </div>
      </div>
    </Container>
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
