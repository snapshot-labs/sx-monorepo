<script setup lang="ts">
import {
  _rt,
  _n,
  shortenAddress,
  compareAddresses,
  sanitizeUrl,
  getUrl,
  getProposalId
} from '@/helpers/utils';
import { Proposal } from '@/types';

const props = defineProps<{
  proposal: Proposal;
}>();

const router = useRouter();
const { getCurrent, getTsFromCurrent } = useMetaStore();
const { web3 } = useWeb3();
const { cancelProposal } = useActions();
const { createDraft } = useEditor();

const modalOpenVotes = ref(false);
const modalOpenTimeline = ref(false);
const cancelling = ref(false);

const editable = computed(() => {
  return (
    compareAddresses(props.proposal.author.id, web3.value.account) &&
    props.proposal.start > (getCurrent(props.proposal.network) || Number.POSITIVE_INFINITY)
  );
});

const cancellable = computed(() => {
  return (
    compareAddresses(props.proposal.space.controller, web3.value.account) &&
    props.proposal.state !== 'executed' &&
    props.proposal.cancelled === false
  );
});

const discussion = computed(() => {
  return sanitizeUrl(props.proposal.discussion);
});

const proposalMetadataUrl = computed(() => {
  const url = getUrl(props.proposal.metadata_uri);
  if (!url) return null;

  return sanitizeUrl(url);
});

async function handleEditClick() {
  if (!props.proposal) return;

  const spaceId = `${props.proposal.network}:${props.proposal.space.id}`;

  const draftId = createDraft(spaceId, {
    proposalId: props.proposal.proposal_id,
    title: props.proposal.title,
    body: props.proposal.body,
    discussion: props.proposal.discussion,
    executionStrategy:
      props.proposal.execution_strategy_type === 'none'
        ? null
        : {
            address: props.proposal.execution_strategy,
            type: props.proposal.execution_strategy_type
          },
    execution: props.proposal.execution
  });

  router.push({
    name: 'editor',
    params: {
      id: spaceId,
      key: draftId
    }
  });
}

async function handleCancelClick() {
  cancelling.value = true;

  try {
    await cancelProposal(props.proposal);
  } finally {
    cancelling.value = false;
  }
}
</script>

<template>
  <Container class="pt-5 !max-w-[660px] mx-0 md:mx-auto">
    <div>
      <h1 class="mb-3 text-[36px] leading-10">
        {{ proposal.title || `Proposal #${proposal.proposal_id}` }}
        <span class="text-skin-text">{{ getProposalId(proposal) }}</span>
      </h1>

      <ProposalStatus :state="proposal.state" class="top-[7.5px]" />

      <div class="flex justify-between items-center mb-3">
        <router-link
          :to="{
            name: 'user',
            params: { id: `${proposal.network}:${proposal.author.id}` }
          }"
          class="flex items-center py-3"
        >
          <Stamp :id="proposal.author.id" :size="32" class="mr-1" />
          <div class="flex flex-col ml-2 leading-4 gap-1">
            {{ shortenAddress(proposal.author.id) }}
            <span class="text-skin-text text-[16px]">
              In
              <router-link
                :to="{
                  name: 'space-overview',
                  params: { id: `${proposal.network}:${proposal.space.id}` }
                }"
                class="text-skin-text"
              >
                {{ proposal.space.name }}
              </router-link>
              · {{ _rt(proposal.created) }}</span
            >
          </div>
        </router-link>
        <UiDropdown>
          <template #button>
            <IH-dots-vertical class="text-skin-link" />
          </template>
          <template #items>
            <UiDropdownItem v-if="editable" v-slot="{ active }">
              <button
                class="flex items-center gap-2"
                :class="{ 'opacity-80': active }"
                @click="handleEditClick"
              >
                <IS-pencil :width="16" />
                Edit proposal
              </button>
            </UiDropdownItem>
            <UiDropdownItem v-if="cancellable" v-slot="{ active, disabled }" :disabled="cancelling">
              <button
                class="flex items-center gap-2"
                :class="{ 'opacity-80': active, 'opacity-40': disabled }"
                @click="handleCancelClick"
              >
                <IS-x-mark :width="16" />
                Cancel proposal
              </button>
            </UiDropdownItem>
            <UiDropdownItem v-if="proposalMetadataUrl" v-slot="{ active }">
              <a
                :href="proposalMetadataUrl"
                target="_blank"
                class="flex items-center gap-2"
                :class="{ 'opacity-80': active }"
              >
                <IH-arrow-sm-right class="-rotate-45" :width="16" />
                View metadata
              </a>
            </UiDropdownItem>
          </template>
        </UiDropdown>
      </div>
      <Markdown v-if="proposal.body" class="mb-4" :body="proposal.body" />
      <div v-if="discussion">
        <h4 class="mb-3 eyebrow flex items-center">
          <IH-chat-alt class="inline-block mr-2" />
          <span>Discussion</span>
        </h4>
        <a :href="discussion" target="_blank" class="block mb-5">
          <Preview :url="discussion" />
        </a>
      </div>
      <div v-if="proposal.execution && proposal.execution.length > 0">
        <h4 class="mb-3 eyebrow flex items-center">
          <IH-play class="inline-block mr-2" />
          <span>Execution</span>
        </h4>
        <div class="mb-4">
          <BlockExecution :txs="proposal.execution" />
        </div>
      </div>
      <div
        v-if="
          proposal.execution &&
          proposal.execution.length > 0 &&
          BigInt(proposal.scores_total) >= BigInt(proposal.quorum) &&
          BigInt(proposal.scores[0]) > BigInt(proposal.scores[1]) &&
          proposal.has_execution_window_opened
        "
      >
        <h4 class="mb-3 eyebrow flex items-center">
          <IH-play class="inline-block mr-2" />
          <span>Actions</span>
        </h4>
        <div class="mb-4">
          <BlockActions :proposal="proposal" />
        </div>
      </div>
      <div>
        <a class="text-skin-text" @click="modalOpenVotes = true">
          {{ _n(proposal.vote_count) }} {{ proposal.vote_count !== 1 ? 'votes' : 'vote' }}
        </a>
        ·
        <a
          class="text-skin-text"
          @click="modalOpenTimeline = true"
          v-text="_rt(getTsFromCurrent(proposal.network, proposal.max_end))"
        />
        <template v-if="proposal.edited"> · (edited)</template>
      </div>
    </div>
  </Container>
  <teleport to="#modal">
    <ModalVotes
      v-if="proposal"
      :open="modalOpenVotes"
      :proposal="proposal"
      @close="modalOpenVotes = false"
    />
    <ModalTimeline
      v-if="proposal"
      :open="modalOpenTimeline"
      :proposal="proposal"
      @close="modalOpenTimeline = false"
    />
  </teleport>
</template>
