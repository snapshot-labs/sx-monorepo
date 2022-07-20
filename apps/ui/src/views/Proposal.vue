<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { sanitizeUrl } from '@braintree/sanitize-url';
import { _rt, _n, shortenAddress, getUrl } from '@/helpers/utils';
import apollo from '@/helpers/apollo';
import { PROPOSAL_QUERY } from '@/helpers/queries';
import { useActions } from '@/composables/useActions';
import txs from '@/helpers/execution.json';

const route = useRoute();
const { vote } = useActions();
const id = parseInt(route.params.id || 0);
const space = route.params.space;
const proposal = ref({});
const discussion = ref('');
const loaded = ref(false);
const modalOpenVotes = ref(false);
const modalOpenTimeline = ref(false);

onMounted(async () => {
  const { data } = await apollo.query({
    query: PROPOSAL_QUERY,
    variables: { id: `${space}/${id}` }
  });
  proposal.value = data.proposal;
  if (
    data.proposal.discussion &&
    sanitizeUrl(data.proposal.discussion) !== 'about:blank'
  )
    discussion.value = sanitizeUrl(data.proposal.discussion);
  loaded.value = true;
});
</script>

<template>
  <div>
    <Container v-if="!loaded" class="pt-5">
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
                params: { id: proposal.author }
              }"
            >
              <Stamp :id="proposal.author" :size="24" class="mr-1" />
              {{ shortenAddress(proposal.author) }}
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
            v-text="_rt(proposal.end)"
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
