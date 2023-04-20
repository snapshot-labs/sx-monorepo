<script setup lang="ts">
import { useProposalsStore } from '@/stores/proposals';
import { getNetwork } from '@/networks';
import { _rt, _n, shortenAddress, getUrl, sanitizeUrl } from '@/helpers/utils';
import { Choice, NetworkID } from '@/types';
import { VotingPower } from '@/networks/types';

const route = useRoute();
const proposalsStore = useProposalsStore();
const { web3 } = useWeb3();
const { vote } = useActions();
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
                  params: { id: `${proposal.network}:${proposal.author.id}` }
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
            <VotingPowerIndicator
              :network-id="networkId as NetworkID"
              :loading="loadingVotingPower"
              :voting-power-symbol="proposal.space.voting_power_symbol"
              :voting-powers="votingPowers"
              class="mr-2"
            />
            <a v-if="proposalMetadataUrl" :href="proposalMetadataUrl" target="_blank">
              <UiButton class="!w-[46px] !h-[46px] !px-[12px]">
                <IH-dots-horizontal />
              </UiButton>
            </a>
          </div>
          <Markdown v-if="proposal.body" class="mb-4" :body="proposal.body" />
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
          <Vote :proposal="proposal">
            <template #voted="{ vote: userVote }">
              <h4 class="mb-3 eyebrow flex items-center">
                <IH-chart-bar class="inline-block mr-2" />
                <span>Results</span>
              </h4>
              <Results :proposal="proposal" :decimals="votingPowerDecimals" with-details />
              <div class="mt-2">
                <div v-if="userVote.choice === 1">
                  You already voted <strong>for</strong> this proposal
                </div>
                <div v-else-if="userVote.choice === 2">
                  You already voted <strong>against</strong> this proposal
                </div>
                <div v-else-if="userVote.choice === 3">
                  You already <strong>abstained</strong> from voting on this proposal
                </div>
              </div>
            </template>
            <template #ended>
              <h4 class="mb-3 eyebrow flex items-center">
                <IH-chart-bar class="inline-block mr-2" />
                <span>Results</span>
              </h4>
              <Results :proposal="proposal" :decimals="votingPowerDecimals" with-details />
            </template>
            <div class="grid grid-cols-3 gap-2">
              <UiButton
                class="w-full !text-white !bg-green !border-green"
                title="For"
                :primary="true"
                :loading="sendingType === 1"
                @click="handleVoteClick(1)"
              >
                <IH-check class="inline-block" />
              </UiButton>
              <UiButton
                class="w-full !text-white !bg-red !border-red"
                title="Against"
                :primary="true"
                :loading="sendingType === 2"
                @click="handleVoteClick(2)"
              >
                <IH-x class="inline-block" />
              </UiButton>
              <UiButton
                class="w-full !text-white !bg-gray-500 !border-gray-500"
                title="Abstain"
                :primary="true"
                :loading="sendingType === 3"
                @click="handleVoteClick(3)"
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
