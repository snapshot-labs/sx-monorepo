<script setup lang="ts">
import { useProposalsStore } from '@/stores/proposals';
import { getNetwork } from '@/networks';
import { _rt, _n, shortenAddress, getUrl, sanitizeUrl, compareAddresses } from '@/helpers/utils';
import { Choice, NetworkID } from '@/types';
import { VotingPower } from '@/networks/types';

const route = useRoute();
const router = useRouter();
const proposalsStore = useProposalsStore();
const { web3 } = useWeb3();
const { vote } = useActions();
const { createDraft } = useEditor();
const id = parseInt((route.params.id as string) || '0');
const spaceParam = route.params.space as string;
const [networkId, space] = spaceParam.split(':');

const modalOpenVotes = ref(false);
const modalOpenTimeline = ref(false);
const sendingType = ref<null | number>(null);
const votingPowers = ref([] as VotingPower[]);
const loadingVotingPower = ref(true);

const proposal = computed(() => proposalsStore.getProposal(space, id, networkId as NetworkID));
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

async function getVotingPower() {
  const network = getNetwork(networkId as NetworkID);

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
  } catch (err) {
    console.warn('err', err);
    votingPowers.value = [];
  } finally {
    loadingVotingPower.value = false;
  }
}

async function handleEditClick() {
  if (!proposal.value) return;

  const draftId = createDraft(spaceParam, {
    proposalId: proposal.value.proposal_id,
    title: proposal.value.title,
    body: proposal.value.body,
    discussion: proposal.value.discussion,
    executionStrategy: {
      address: proposal.value.execution_strategy,
      type: proposal.value.execution_strategy_type
    },
    execution: proposal.value.execution
  });

  router.push({
    name: 'editor',
    params: {
      id: spaceParam,
      key: draftId
    }
  });
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

onMounted(() => {
  proposalsStore.fetchProposal(space, id, networkId as NetworkID);
});

watch([() => web3.value.account, proposal], () => getVotingPower());
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
              <span class="text-md">
                {{ shortenAddress(proposal.author.id) }}
              </span>
              <span class="text-skin-text text-[16px]" v-text="_rt(proposal.created)" />
            </div>
          </router-link>
          <div class="flex items-center gap-4 mr-3">
            <UiTooltip v-if="editable" title="Edit proposal">
              <a @click="handleEditClick">
                <IH-pencil />
              </a>
            </UiTooltip>
            <UiTooltip title="View proposal metadata">
              <a v-if="proposalMetadataUrl" :href="proposalMetadataUrl" target="_blank">
                <IH-dots-vertical />
              </a>
            </UiTooltip>
          </div>
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
                v-text="_rt(proposal.max_end)"
              />
            </div>
          </div>
        </Container>
      </div>
      <div
        class="static md:fixed md:top-[72px] md:right-0 w-full md:h-screen md:max-w-[340px] p-4 border-l"
      >
        <VotingPowerIndicator
          v-if="web3.account"
          v-slot="props"
          :network-id="networkId as NetworkID"
          :loading="loadingVotingPower"
          :voting-power-symbol="proposal.space.voting_power_symbol"
          :voting-powers="votingPowers"
          class="mb-2 mt-4 first:mt-1"
        >
          <h4 class="block eyebrow">Your voting power</h4>
          <div class="pt-2">
            <UiLoading v-if="loadingVotingPower" />
            <div v-else class="text-skin-link text-lg">
              {{ props.formattedVotingPower }}
            </div>
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
        <h4 class="block eyebrow mb-2 mt-4">Results</h4>
        <Results with-details :proposal="proposal" :decimals="votingPowerDecimals" />
      </div>
    </template>
    <teleport to="#modal">
      <ModalVotes
        v-if="proposal"
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
