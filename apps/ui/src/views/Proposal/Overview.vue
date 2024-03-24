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
import { offchainNetworks } from '@/networks';
import { Proposal } from '@/types';

const props = defineProps<{
  proposal: Proposal;
}>();

const router = useRouter();
const { getCurrent, getTsFromCurrent } = useMetaStore();
const { web3 } = useWeb3();
const { cancelProposal } = useActions();
const { createDraft } = useEditor();
const { state: aiState, body: aiSummary, fetchAiSummary } = useAiSummary(props.proposal.id);

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
  if (offchainNetworks.includes(props.proposal.network)) {
    const addresses = [
      props.proposal.author.id,
      props.proposal.space.admins || [],
      props.proposal.space.moderators || []
    ].flat();

    return addresses.some(address => compareAddresses(address, web3.value.account));
  } else {
    return (
      compareAddresses(props.proposal.space.controller, web3.value.account) &&
      props.proposal.state !== 'executed' &&
      props.proposal.cancelled === false
    );
  }
});

const discussion = computed(() => {
  return sanitizeUrl(props.proposal.discussion);
});

const proposalMetadataUrl = computed(() => {
  const url = getUrl(props.proposal.metadata_uri);
  if (!url) return null;

  return sanitizeUrl(url);
});

const votingTime = computed(() => {
  if (!props.proposal) return null;

  const current = getCurrent(props.proposal.network);
  if (!current) return null;

  const time = _rt(getTsFromCurrent(props.proposal.network, props.proposal.max_end));

  const hasEnded = props.proposal.max_end <= current;

  return hasEnded ? `Ended ${time}` : time;
});

async function handleEditClick() {
  if (!props.proposal) return;

  const spaceId = `${props.proposal.network}:${props.proposal.space.id}`;

  const draftId = createDraft(spaceId, {
    proposalId: props.proposal.proposal_id,
    title: props.proposal.title,
    body: props.proposal.body,
    discussion: props.proposal.discussion,
    type: props.proposal.type,
    choices: props.proposal.choices,
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

async function handleAiSummaryClick() {
  await fetchAiSummary();

  if (!aiState.value.error) {
    aiState.value.open = !aiState.value.open;
  }
}
</script>

<template>
  <UiContainer class="pt-5 !max-w-[660px] mx-0 md:mx-auto">
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
          <UiStamp :id="proposal.author.id" :size="32" class="mr-1" />
          <div class="flex flex-col ml-2 leading-4 gap-1">
            {{ proposal.author.name || shortenAddress(proposal.author.id) }}
            <span class="text-skin-text text-sm">
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
        <div class="flex items-center">
          <UiTooltip
            v-if="
              props.proposal.body.length > 500 && offchainNetworks.includes(props.proposal.network)
            "
            :title="aiState.open ? 'Hide AI Summary' : 'Show AI Summary'"
          >
            <UiButton class="w-[46px] !px-0 border-0" @click="handleAiSummaryClick">
              <UiLoading v-if="aiState.loading" />
              <IH-sparkles v-else class="text-skin-text inline-block" />
            </UiButton>
          </UiTooltip>
          <UiDropdown>
            <template #button>
              <UiButton class="w-[46px] !px-0 border-0">
                <IH-dots-vertical class="text-skin-text inline-block" />
              </UiButton>
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
              <UiDropdownItem
                v-if="cancellable"
                v-slot="{ active, disabled }"
                :disabled="cancelling"
              >
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
      </div>
      <div v-if="aiState.open" class="mb-4 border rounded-lg">
        <div class="p-4">
          <div v-if="aiState.error">
            <UiAlert type="error">
              There was an error fetching the AI summary.
              <UiButton
                class="flex items-center gap-2 !p-3 !h-[28px] text-sm bg-transparent"
                @click="fetchAiSummary"
              >
                <IH-refresh class="h-[16px] w-[16px]" /> Retry
              </UiButton>
            </UiAlert>
          </div>
          <div v-else class="text-md text-skin-link">{{ aiSummary }}</div>
        </div>
        <div v-if="aiSummary" class="bg-skin-border p-4 py-2 flex gap-2 items-center text-sm">
          <IH-exclamation />
          AI responses can be inaccurate or misleading.
        </div>
      </div>
      <UiMarkdown v-if="proposal.body" class="mb-4" :body="proposal.body" />
      <div v-if="discussion">
        <h4 class="mb-3 eyebrow flex items-center">
          <IH-chat-alt class="inline-block mr-2" />
          <span>Discussion</span>
        </h4>
        <a :href="discussion" target="_blank" class="block mb-5">
          <UiLinkPreview :url="discussion" :show-default="true" />
        </a>
      </div>
      <div v-if="proposal.execution && proposal.execution.length > 0">
        <h4 class="mb-3 eyebrow flex items-center">
          <IH-play class="inline-block mr-2" />
          <span>Execution</span>
        </h4>
        <div class="mb-4">
          <ProposalExecutionsList :txs="proposal.execution" />
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
          <ProposalExecutionActions :proposal="proposal" />
        </div>
      </div>
      <div>
        <a class="text-skin-text" @click="modalOpenVotes = true">
          {{ _n(proposal.vote_count) }} {{ proposal.vote_count !== 1 ? 'votes' : 'vote' }}
        </a>
        ·
        <a class="text-skin-text" @click="modalOpenTimeline = true" v-text="votingTime" />
        <template v-if="proposal.edited"> · (edited)</template>
      </div>
    </div>
  </UiContainer>
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
