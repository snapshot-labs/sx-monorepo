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
const route = useRoute();
const uiStore = useUiStore();
const proposalsStore = useProposalsStore();
const { getCurrent, getTsFromCurrent } = useMetaStore();
const { web3 } = useWeb3();
const { cancelProposal } = useActions();
const { createDraft } = useEditor();
const {
  state: aiSummaryState,
  content: aiSummaryContent,
  fetch: fetchAiSummary
} = useAi('summary', props.proposal.id);
const {
  state: aiSpeechState,
  content: aiSpeechContent,
  fetch: fetchAiSpeech
} = useAi('speech', props.proposal.id);
const {
  state: audioState,
  play: playAudio,
  pause: pauseAudio,
  init: initAudio,
  destroy: destroyAudio
} = useAudio();

const modalOpenVotes = ref(false);
const modalOpenTimeline = ref(false);
const cancelling = ref(false);
const aiSummaryOpen = ref(false);

const currentUrl = `${window.location.origin}/#${route.path}`;
const shareMsg = encodeURIComponent(
  `${props.proposal.space.name}: ${props.proposal.title} ${currentUrl}`
);

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
    const result = await cancelProposal(props.proposal);
    if (result) {
      proposalsStore.reset(props.proposal.space.id, props.proposal.network);
      router.push({
        name: 'space-overview',
        params: {
          id: `${props.proposal.network}:${props.proposal.space.id}`
        }
      });
    }
  } finally {
    cancelling.value = false;
  }
}

async function handleAiSummaryClick() {
  if (aiSummaryContent.value) {
    aiSummaryOpen.value = !aiSummaryOpen.value;
    return;
  }

  await fetchAiSummary();

  if (aiSummaryState.value.errored) {
    return uiStore.addNotification('error', 'There was an error fetching the AI summary.');
  }

  aiSummaryOpen.value = true;
}

async function handleAiSpeechClick() {
  if (['playing', 'paused', 'stopped'].includes(audioState.value)) {
    return audioState.value === 'playing' ? pauseAudio() : playAudio();
  }

  try {
    await fetchAiSpeech();

    if (aiSpeechState.value.errored || aiSpeechContent.value === null) throw new Error();

    await initAudio(aiSpeechContent.value);
    playAudio();
  } catch (e) {
    uiStore.addNotification('error', 'Failed to listen proposal, please try again later.');
  }
}

onBeforeUnmount(() => destroyAudio());
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
            params: { id: proposal.author.id }
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
        <div class="flex gap-2 items-center">
          <UiTooltip
            v-if="
              offchainNetworks.includes(props.proposal.network) && props.proposal.body.length > 500
            "
            :title="'AI summary'"
          >
            <UiButton
              class="!p-0 border-0 !h-[auto]"
              :disabled="aiSummaryState.loading"
              @click="handleAiSummaryClick"
            >
              <UiLoading v-if="aiSummaryState.loading" class="inline-block !w-[22px] !h-[22px]" />
              <IH-sparkles
                v-else
                class="inline-block w-[22px] h-[22px]"
                :class="aiSummaryOpen ? 'text-skin-link' : 'text-skin-text'"
              />
            </UiButton>
          </UiTooltip>
          <UiTooltip
            v-if="
              offchainNetworks.includes(props.proposal.network) &&
              props.proposal.body.length > 0 &&
              props.proposal.body.length < 4096
            "
            :title="audioState === 'playing' ? 'Pause' : 'Listen'"
          >
            <UiButton
              class="!p-0 border-0 !h-[auto]"
              :disabled="aiSpeechState.loading"
              @click="handleAiSpeechClick"
            >
              <UiLoading v-if="aiSpeechState.loading" class="inline-block !w-[22px] !h-[22px]" />
              <IH-pause
                v-else-if="audioState === 'playing'"
                class="inline-block w-[22px] h-[22px] text-skin-link"
              />
              <IH-play v-else class="inline-block text-skin-text w-[22px] h-[22px]" />
            </UiButton>
          </UiTooltip>

          <UiDropdown>
            <template #button>
              <UiButton class="!p-0 border-0 !h-[auto]">
                <IH-share class="text-skin-text inline-block w-[22px] h-[22px]" />
              </UiButton>
            </template>
            <template #items>
              <UiDropdownItem v-slot="{ active }">
                <a
                  class="flex items-center gap-2"
                  :class="{ 'opacity-80': active }"
                  :href="`https://twitter.com/intent/tweet/?text=${shareMsg}`"
                  target="_blank"
                >
                  <IC-x />
                  Share on X
                </a>
              </UiDropdownItem>
              <UiDropdownItem v-slot="{ active }">
                <a
                  class="flex items-center gap-2"
                  :class="{ 'opacity-80': active }"
                  :href="`https://hey.xyz/?hashtags=Snapshot&text=${shareMsg}`"
                  target="_blank"
                >
                  <IC-lens />
                  Share on Lens
                </a>
              </UiDropdownItem>
              <UiDropdownItem v-slot="{ active }">
                <a
                  class="flex items-center gap-2"
                  :class="{ 'opacity-80': active }"
                  :href="`https://warpcast.com/~/compose?text=${shareMsg}`"
                  target="_blank"
                >
                  <IC-farcaster />
                  Share on Farcaster
                </a>
              </UiDropdownItem>
            </template>
          </UiDropdown>
          <UiDropdown>
            <template #button>
              <UiButton class="!p-0 border-0 !h-[auto]">
                <IH-dots-vertical class="text-skin-text inline-block w-[22px] h-[22px]" />
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
      <div v-if="aiSummaryOpen" class="mb-6">
        <h4 class="mb-2 eyebrow flex items-center">
          <IH-sparkles class="inline-block mr-2" />
          <span>AI summary</span>
        </h4>
        <div class="text-md text-skin-link mb-2">{{ aiSummaryContent }}</div>
        <div class="flex gap-2 items-center text-sm">
          <IH-exclamation />
          AI can be inaccurate or misleading.
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
