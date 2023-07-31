<script setup lang="ts">
import { useProposalsStore } from '@/stores/proposals';
import { getNetwork } from '@/networks';
import {
  _rt,
  _n,
  shortenAddress,
  getUrl,
  getStampUrl,
  getCacheHash,
  sanitizeUrl,
  compareAddresses
} from '@/helpers/utils';
import { Choice } from '@/types';
import { VotingPower } from '@/networks/types';

const route = useRoute();
const router = useRouter();
const { setFavicon } = useFavicon();
const { param } = useRouteParser('space');
const { resolved, address: spaceAddress, networkId } = useResolve(param);
const { setTitle } = useTitle();
const proposalsStore = useProposalsStore();
const { web3 } = useWeb3();
const { vote, cancelProposal } = useActions();
const { createDraft } = useEditor();

const modalOpenVotes = ref(false);
const modalOpenTimeline = ref(false);
const sendingType = ref<null | number>(null);
const votingPowers = ref([] as VotingPower[]);
const loadingVotingPower = ref(true);
const cancelling = ref(false);

const id = computed(() => parseInt((route.params.id as string) || '0'));
const proposal = computed(() => {
  if (!resolved.value || !spaceAddress.value || !networkId.value) {
    return null;
  }

  return proposalsStore.getProposal(spaceAddress.value, id.value, networkId.value);
});
const votingPowerDecimals = computed(() => {
  if (!proposal.value) return 0;
  return Math.max(
    ...proposal.value.space.strategies_parsed_metadata.map(metadata => metadata.decimals),
    0
  );
});

const discussion = computed(() => {
  if (!proposal.value?.discussion) return null;

  return sanitizeUrl(proposal.value.discussion);
});

const proposalMetadataUrl = computed(() => {
  if (!proposal.value) return null;

  const url = getUrl(proposal.value.metadata_uri);
  if (!url) return null;

  return sanitizeUrl(url);
});

const editable = computed(() => {
  if (!proposal.value) return false;

  return (
    compareAddresses(proposal.value.author.id, web3.value.account) &&
    proposal.value.start * 1000 > Date.now()
  );
});

const cancellable = computed(() => {
  if (!proposal.value) return false;

  return (
    compareAddresses(proposal.value.space.controller, web3.value.account) &&
    proposal.value.executed === false &&
    proposal.value.cancelled === false
  );
});

async function getVotingPower() {
  if (!networkId.value) return;

  const network = getNetwork(networkId.value);

  if (!web3.value.account || !proposal.value) {
    votingPowers.value = [];
    loadingVotingPower.value = false;
    return;
  }

  loadingVotingPower.value = true;
  try {
    votingPowers.value = await network.actions.getVotingPower(
      proposal.value.strategies,
      proposal.value.strategies_params,
      proposal.value.space.strategies_parsed_metadata,
      web3.value.account,
      proposal.value.snapshot
    );
  } catch (e) {
    console.warn('Failed to load voting power', e);
    votingPowers.value = [];
  } finally {
    loadingVotingPower.value = false;
  }
}

async function handleEditClick() {
  if (!proposal.value || !networkId.value || !spaceAddress.value) return;

  const spaceId = `${networkId.value}:${spaceAddress.value}`;

  const draftId = createDraft(spaceId, {
    proposalId: proposal.value.proposal_id,
    title: proposal.value.title,
    body: proposal.value.body,
    discussion: proposal.value.discussion,
    executionStrategy:
      proposal.value.execution_strategy_type === 'none'
        ? null
        : {
            address: proposal.value.execution_strategy,
            type: proposal.value.execution_strategy_type
          },
    execution: proposal.value.execution
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
  if (!proposal.value) return;

  cancelling.value = true;

  try {
    await cancelProposal(proposal.value);
  } finally {
    cancelling.value = false;
  }
}

async function handleVoteClick(choice: Choice) {
  if (!proposal.value) return;

  sendingType.value = choice;

  try {
    await vote(proposal.value, choice);
  } finally {
    sendingType.value = null;
  }
}

watch([() => web3.value.account, proposal], () => getVotingPower());
watch(
  [networkId, spaceAddress, id],
  ([networkId, spaceAddress, id]) => {
    if (!networkId || !spaceAddress) return;

    proposalsStore.fetchProposal(spaceAddress, id, networkId);
  },
  { immediate: true }
);

watchEffect(() => {
  if (!proposal.value) return;

  const faviconUrl = getStampUrl(
    'space-sx',
    proposal.value.space.id,
    16,
    getCacheHash(proposal.value.space.avatar)
  );

  setFavicon(faviconUrl);
  setTitle(proposal.value.title || `Proposal #${proposal.value.proposal_id}`);
});
</script>

<template>
  <div class="flex flex-col">
    <UiLoading v-if="!proposal" class="ml-4 mt-3" />
    <template v-else>
      <div class="flex-1 md:mr-[340px]">
        <div class="flex justify-between items-center mx-4 border-b">
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
              <span class="text-skin-text text-[16px]" v-text="_rt(proposal.created)" />
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
                  <IS-arrow-top-right-on-square :width="16" />
                  View metadata
                </a>
              </UiDropdownItem>
            </template>
          </UiDropdown>
        </div>
        <Container class="pt-5 max-w-[630px] mx-0 md:mx-auto">
          <div>
            <h1 class="mb-4 text-[36px]">
              {{ proposal.title || `Proposal #${proposal.proposal_id}` }}
            </h1>
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
                BigInt(proposal.scores_1) > BigInt(proposal.scores_2) &&
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
                {{ _n(proposal.vote_count) }} votes
              </a>
              ·
              <a
                class="text-skin-text"
                @click="modalOpenTimeline = true"
                v-text="_rt(proposal.created)"
              />
              <template v-if="proposal.edited"> · (edited)</template>
            </div>
          </div>
        </Container>
      </div>
      <div
        class="static md:fixed md:top-[72px] md:right-0 w-full md:h-screen md:max-w-[340px] p-4 border-l"
      >
        <VotingPowerIndicator
          v-if="web3.account && networkId"
          v-slot="props"
          :network-id="networkId"
          :loading="loadingVotingPower"
          :voting-power-symbol="proposal.space.voting_power_symbol"
          :voting-powers="votingPowers"
          class="mb-2 mt-4 first:mt-1"
        >
          <h4 class="block eyebrow">Your voting power</h4>
          <div class="pt-2">
            <UiLoading v-if="loadingVotingPower" />
            <button v-else class="text-skin-link text-lg" @click="props.onClick">
              {{ props.formattedVotingPower }}
            </button>
          </div>
        </VotingPowerIndicator>
        <h4 class="block eyebrow mb-2 mt-4 first:mt-1">Cast your vote</h4>
        <Vote v-if="proposal" :proposal="proposal">
          <div class="flex space-x-2 py-2">
            <UiTooltip title="For">
              <UiButton
                class="!text-green !border-green !w-[48px] !h-[48px] !px-0"
                :loading="sendingType === 1"
                @click="handleVoteClick(1)"
              >
                <IH-check class="inline-block" />
              </UiButton>
            </UiTooltip>
            <UiTooltip title="Against">
              <UiButton
                class="!text-red !border-red !w-[48px] !h-[48px] !px-0"
                :loading="sendingType === 2"
                @click="handleVoteClick(2)"
              >
                <IH-x class="inline-block" />
              </UiButton>
            </UiTooltip>
            <UiTooltip title="Abstain">
              <UiButton
                class="!text-gray-500 !border-gray-500 !w-[48px] !h-[48px] !px-0"
                :loading="sendingType === 3"
                @click="handleVoteClick(3)"
              >
                <IH-arrow-sm-right class="inline-block" />
              </UiButton>
            </UiTooltip>
          </div>
        </Vote>
        <template v-if="!proposal.cancelled">
          <h4 class="block eyebrow mb-2 mt-4">Results</h4>
          <Results with-details :proposal="proposal" :decimals="votingPowerDecimals" />
        </template>
      </div>
    </template>
    <teleport to="#modal">
      <ModalVotes
        v-if="proposal"
        :open="modalOpenVotes"
        :network-id="proposal.network"
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
  </div>
</template>
