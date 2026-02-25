<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { EVM_EMPTY_ADDRESS } from '@/helpers/constants';
import {
  _n,
  compareAddresses,
  getProposalId,
  getUrl,
  sanitizeUrl,
  shortenAddress
} from '@/helpers/utils';
import { getNetwork, offchainNetworks } from '@/networks';
import { SNAPSHOT_URLS } from '@/networks/offchain';
import { PROPOSALS_KEYS } from '@/queries/proposals';
import { Proposal } from '@/types';

const WHITELISTED_SPACES = ['kleros.eth', 'paraswap-dao.eth'];

const props = defineProps<{
  proposal: Proposal;
}>();

const queryClient = useQueryClient();
const router = useRouter();
const uiStore = useUiStore();
const { getCurrent } = useMetaStore();
const { web3 } = useWeb3();
const { flagProposal, cancelProposal } = useActions();
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
const { isDownloadingVotes, downloadVotes } = useReportDownload();

const modalOpenTimeline = ref(false);
const flagging = ref(false);
const cancelling = ref(false);
const aiSummaryOpen = ref(false);

const flaggable = computed(() => {
  if (!offchainNetworks.includes(props.proposal.network)) return false;
  if (props.proposal.flagged) return false;

  const addresses = [
    props.proposal.space.admins || [],
    props.proposal.space.moderators || []
  ].flat();

  return addresses.some(address =>
    compareAddresses(address, web3.value.account)
  );
});

const editable = computed(() => {
  // HACK: here we need to use snapshot instead of start because start is artificially
  // shifted for Starknet's proposals with ERC20Votes strategies.
  const pivotName = offchainNetworks.includes(props.proposal.network)
    ? 'start'
    : 'snapshot';

  return (
    compareAddresses(props.proposal.author.id, web3.value.account) &&
    props.proposal[pivotName] >
      (getCurrent(props.proposal.network) || Number.POSITIVE_INFINITY)
  );
});

const cancellable = computed(() => {
  if (offchainNetworks.includes(props.proposal.network)) {
    const addresses = [
      props.proposal.author.id,
      props.proposal.space.admins || [],
      props.proposal.space.moderators || []
    ].flat();

    return addresses.some(address =>
      compareAddresses(address, web3.value.account)
    );
  } else {
    return (
      compareAddresses(props.proposal.space.controller, web3.value.account) &&
      !['queued', 'vetoed', 'executed'].includes(props.proposal.state) &&
      props.proposal.cancelled === false
    );
  }
});

const discussion = computed(() => {
  return sanitizeUrl(props.proposal.discussion);
});

const proposalMetadataUrl = computed(() => {
  if (props.proposal.space.protocol === 'governor-bravo') {
    return null;
  }

  const url = getUrl(props.proposal.metadata_uri);
  if (!url) return null;

  return sanitizeUrl(url);
});

const snapshotV1Url = computed(() => {
  if (!offchainNetworks.includes(props.proposal.network)) return null;
  const base = SNAPSHOT_URLS[props.proposal.network];
  if (!base) return null;
  return `${base}/#/${props.proposal.space.id}/proposal/${props.proposal.id}`;
});

const proposalTransactionId = computed(() => {
  const network = getNetwork(props.proposal.network);

  if (
    ['governor-bravo', '@openzeppelin/governor'].includes(
      props.proposal.space.protocol
    )
  ) {
    return network.helpers.getExplorerUrl(props.proposal.tx, 'transaction');
  }

  return null;
});

const endTime = useRelativeTime(() => props.proposal.max_end);

const votingTime = computed(() => {
  if (!props.proposal) return null;

  const current = getCurrent(props.proposal.network);
  if (!current) return null;

  const hasEnded = props.proposal.max_end <= current;

  return hasEnded ? `Ended ${endTime.value}` : endTime.value;
});

async function handleEditClick() {
  if (!props.proposal) return;

  const spaceId = `${props.proposal.network}:${props.proposal.space.id}`;

  const executions = Object.fromEntries(
    props.proposal.executions.map(execution => {
      const address = offchainNetworks.includes(props.proposal.network)
        ? execution.safeAddress
        : props.proposal.execution_strategy;

      return [address, execution.transactions];
    })
  );

  const draftId = await createDraft(spaceId, {
    originalProposal: props.proposal,
    title: props.proposal.title,
    body: props.proposal.body,
    discussion: props.proposal.discussion,
    type: props.proposal.type,
    choices: props.proposal.choices,
    labels: props.proposal.labels,
    privacy: props.proposal.privacy,
    created: props.proposal.created,
    start: props.proposal.start,
    min_end: props.proposal.min_end,
    max_end: props.proposal.max_end,
    executions
  });

  router.push({
    name: 'space-editor',
    params: {
      key: draftId
    }
  });
}

async function handleDuplicateClick() {
  if (!props.proposal) return;

  const spaceId = `${props.proposal.network}:${props.proposal.space.id}`;

  const executions = Object.fromEntries(
    props.proposal.executions.map(execution => {
      const address = offchainNetworks.includes(props.proposal.network)
        ? execution.safeAddress
        : props.proposal.execution_strategy;

      return [address, execution.transactions];
    })
  );

  const draftId = await createDraft(spaceId, {
    title: props.proposal.title,
    body: props.proposal.body,
    discussion: props.proposal.discussion,
    type: props.proposal.type,
    choices: props.proposal.choices,
    labels: props.proposal.labels,
    executions
  });

  router.push({
    name: 'space-editor',
    params: {
      key: draftId
    }
  });
}

async function handleFlagClick() {
  flagging.value = true;

  try {
    const result = await flagProposal(props.proposal);
    if (result) {
      queryClient.invalidateQueries({
        queryKey: PROPOSALS_KEYS.space(
          props.proposal.network,
          props.proposal.space.id
        )
      });

      uiStore.addNotification('success', 'Proposal flagged successfully.');

      router.push({
        name: 'space-overview'
      });
    }
  } finally {
    flagging.value = false;
  }
}

async function handleCancelClick() {
  cancelling.value = true;

  try {
    const result = await cancelProposal(props.proposal);
    if (result) {
      queryClient.invalidateQueries({
        queryKey: PROPOSALS_KEYS.space(
          props.proposal.network,
          props.proposal.space.id
        )
      });

      uiStore.addNotification('success', 'Proposal cancelled successfully.');

      router.push({
        name: 'space-overview'
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
    return uiStore.addNotification(
      'error',
      'There was an error fetching the AI summary.'
    );
  }

  aiSummaryOpen.value = true;
}

async function handleAiSpeechClick() {
  if (['playing', 'paused', 'stopped'].includes(audioState.value)) {
    return audioState.value === 'playing' ? pauseAudio() : playAudio();
  }

  try {
    await fetchAiSpeech();

    if (aiSpeechState.value.errored || aiSpeechContent.value === null)
      throw new Error();

    await initAudio(aiSpeechContent.value);
    playAudio();
  } catch {
    uiStore.addNotification(
      'error',
      'Failed to listen proposal, please try again later.'
    );
  }
}

async function handleDownloadVotes() {
  if (!props.proposal) return;

  try {
    await downloadVotes(props.proposal.proposal_id);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'PENDING_GENERATION') {
        return uiStore.addNotification(
          'success',
          'Your report is currently being generated. It may take a few minutes. Please check back shortly.'
        );
      }

      uiStore.addNotification(
        'error',
        "We're having trouble connecting to the server responsible for downloads"
      );
    }
  }
}

onBeforeUnmount(() => destroyAudio());
</script>

<template>
  <UiContainer class="pt-5 !max-w-[730px] mx-0 md:mx-auto">
    <ContentFlagable :item="proposal">
      <UiAlert v-if="proposal.isInvalid" type="error" class="mb-3">
        <template v-if="proposal.execution_strategy === EVM_EMPTY_ADDRESS">
          This proposal is invalid and was not created correctly. We cannot
          display its details.
        </template>
        <template v-else>
          This proposal is invalid and was not created correctly. We cannot
          display its details, and it <strong>includes execution</strong>. This
          might mean possible malicious behavior. We strongly advise you to vote
          against this proposal.
        </template>
      </UiAlert>

      <h1 class="mb-3 text-[42px] leading-[1.1em] break-words">
        {{ proposal.title || `Proposal #${proposal.proposal_id}` }}
      </h1>

      <ProposalStatus :state="proposal.state" class="top-[7.5px] mb-4" />

      <WidgetFutarchy
        v-if="WHITELISTED_SPACES.includes(proposal.space.id)"
        :proposal="proposal"
      />

      <div class="flex justify-between items-center mb-4">
        <AppLink
          :to="{
            name: 'space-user-statement',
            params: {
              space: `${proposal.network}:${proposal.space.id}`,
              user: proposal.author.id
            }
          }"
          class="flex items-center py-3"
        >
          <UiStamp :id="proposal.author.id" :size="32" class="mr-1" />
          <div class="flex flex-col ml-2 leading-4 gap-1">
            <div>
              {{ proposal.author.name || shortenAddress(proposal.author.id) }}
              <UiPill
                v-if="proposal.author.role"
                :label="proposal.author.role"
              />
            </div>
            <span class="text-skin-text text-sm">
              In
              <AppLink
                :to="{
                  name: 'space-overview',
                  params: { space: `${proposal.network}:${proposal.space.id}` }
                }"
                class="text-skin-text"
              >
                {{ proposal.space.name }}
              </AppLink>
              <TimeRelative v-slot="{ relativeTime }" :time="proposal.created">
                <span> · {{ relativeTime }}</span>
              </TimeRelative>
              <span> · {{ getProposalId(proposal) }}</span>
            </span>
          </div>
        </AppLink>
        <div class="flex gap-2 items-center">
          <UiTooltip
            v-if="
              !proposal.flagged &&
              offchainNetworks.includes(props.proposal.network) &&
              props.proposal.body.length > 500
            "
            :title="'AI summary'"
            class="flex items-center"
          >
            <UiButton
              class="!border-0"
              uniform
              :size="22"
              :disabled="aiSummaryState.loading"
              :loading="aiSummaryState.loading"
              @click="handleAiSummaryClick"
            >
              <IH-sparkles
                class="size-[22px]"
                :class="aiSummaryOpen ? 'text-skin-link' : 'text-skin-text'"
              />
            </UiButton>
          </UiTooltip>
          <UiTooltip
            v-if="
              !proposal.flagged &&
              offchainNetworks.includes(props.proposal.network) &&
              props.proposal.body.length > 0 &&
              props.proposal.body.length < 4096
            "
            :title="audioState === 'playing' ? 'Pause' : 'Listen'"
            class="flex items-center"
          >
            <UiButton
              class="!border-0"
              uniform
              :size="22"
              :disabled="aiSpeechState.loading"
              :loading="aiSpeechState.loading"
              @click="handleAiSpeechClick"
            >
              <IH-pause
                v-if="audioState === 'playing'"
                class="size-[22px] text-skin-link"
              />
              <IH-play v-else class="text-skin-text size-[22px]" />
            </UiButton>
          </UiTooltip>
          <DropdownShare
            :shareable="proposal"
            type="proposal"
            class="flex items-center"
          >
            <template #button>
              <button>
                <IH-share class="size-[22px]" />
              </button>
            </template>
          </DropdownShare>
          <UiDropdown class="flex items-center">
            <template #button>
              <button>
                <IH-dots-vertical class="size-[22px]" />
              </button>
            </template>
            <template #items>
              <UiDropdownItem @click="handleDuplicateClick">
                <IH-document-duplicate :width="16" />
                Duplicate proposal
              </UiDropdownItem>
              <UiDropdownItem
                v-if="
                  proposal.network === 's' &&
                  proposal.completed &&
                  ['passed', 'rejected', 'executed', 'closed'].includes(
                    proposal.state
                  )
                "
                @click="handleDownloadVotes"
              >
                <template v-if="isDownloadingVotes">
                  <UiLoading :size="18" />
                  Downloading votes
                </template>
                <template v-else>
                  <IS-arrow-down-tray />
                  Download votes
                </template>
              </UiDropdownItem>
              <UiDropdownItem v-if="editable" @click="handleEditClick">
                <IS-pencil :width="16" />
                Edit proposal
              </UiDropdownItem>
              <UiDropdownItem
                v-if="flaggable"
                :disabled="flagging"
                @click="handleFlagClick"
              >
                <IH-flag :width="16" />
                Flag proposal
              </UiDropdownItem>
              <UiDropdownItem
                v-if="cancellable"
                :disabled="cancelling"
                @click="handleCancelClick"
              >
                <IS-x-mark :width="16" />
                Cancel proposal
              </UiDropdownItem>
              <UiDropdownItem
                v-if="proposalMetadataUrl"
                :to="proposalMetadataUrl"
              >
                <IH-arrow-sm-right class="-rotate-45" :width="16" />
                View metadata
              </UiDropdownItem>
              <UiDropdownItem
                v-if="proposalTransactionId"
                :to="proposalTransactionId"
              >
                <IH-arrow-sm-right class="-rotate-45" :width="16" />
                View on block explorer
              </UiDropdownItem>
              <UiDropdownItem v-if="snapshotV1Url" :to="snapshotV1Url">
                <IH-arrow-sm-right class="-rotate-45" :width="16" />
                View on v1 interface
              </UiDropdownItem>
            </template>
          </UiDropdown>
        </div>
      </div>

      <div v-if="aiSummaryOpen" class="mb-6">
        <UiEyebrow class="mb-2 flex items-center gap-2">
          <IH-sparkles />
          <span>AI summary</span>
        </UiEyebrow>
        <div class="text-md text-skin-link mb-2">{{ aiSummaryContent }}</div>
        <div class="flex gap-2 items-center text-sm">
          <IH-exclamation />
          AI can be inaccurate or misleading.
        </div>
      </div>
      <UiMarkdown v-if="proposal.body" class="mb-8" :body="proposal.body" />
      <div v-if="discussion">
        <UiEyebrow class="mb-3 flex items-center gap-2">
          <IH-chat-alt />
          <span>Discussion</span>
        </UiEyebrow>
        <AppLink :to="discussion" class="block mb-5">
          <UiLinkPreview :url="discussion" :show-default="true" />
        </AppLink>
      </div>
      <div v-if="proposal.executions && proposal.executions.length > 0">
        <UiEyebrow class="mb-3 flex items-center gap-2">
          <IH-play />
          <span>Execution</span>
        </UiEyebrow>
        <div class="mb-4">
          <ProposalExecutionsList
            :network-id="proposal.network"
            :proposal="proposal"
            :executions="proposal.executions"
          />
        </div>
      </div>
      <div>
        <AppLink
          class="text-skin-text"
          :to="{
            name: 'space-proposal-votes',
            params: {
              proposal: proposal.proposal_id,
              space: `${proposal.network}:${proposal.space.id}`
            }
          }"
        >
          {{ _n(proposal.vote_count) }}
          {{ proposal.vote_count !== 1 ? 'votes' : 'vote' }}
        </AppLink>
        ·
        <button
          type="button"
          class="text-skin-text"
          @click="modalOpenTimeline = true"
          v-text="votingTime"
        />
        <template v-if="proposal.edited"> · (edited)</template>
      </div>
    </ContentFlagable>
  </UiContainer>
  <teleport to="#modal">
    <ModalTimeline
      v-if="proposal"
      :open="modalOpenTimeline"
      :proposal="proposal"
      @close="modalOpenTimeline = false"
    />
  </teleport>
</template>
