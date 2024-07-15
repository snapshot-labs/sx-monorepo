<script setup lang="ts">
import { offchainNetworks } from '@/networks';
import { getStampUrl, getCacheHash, sanitizeUrl, getFormattedVotingPower } from '@/helpers/utils';
import type { Choice } from '@/types';

const route = useRoute();
const proposalsStore = useProposalsStore();
const { votingPower, fetch: fetchVotingPower, reset: resetVotingPower } = useVotingPower();
const { setFavicon } = useFavicon();
const { param } = useRouteParser('space');
const { resolved, address: spaceAddress, networkId } = useResolve(param);
const { setTitle } = useTitle();
const { web3 } = useWeb3();
const { loadVotes } = useAccount();
const { modalAccountOpen } = useModal();

const modalOpenVote = ref(false);
const selectedChoice = ref<Choice | null>(null);

const id = computed(() => route.params.id as string);
const proposal = computed(() => {
  if (!resolved.value || !spaceAddress.value || !networkId.value) {
    return null;
  }

  return proposalsStore.getProposal(spaceAddress.value, id.value, networkId.value);
});

const discussion = computed(() => {
  if (!proposal.value) return null;

  return sanitizeUrl(proposal.value.discussion);
});

const votingPowerDecimals = computed(() => {
  if (!proposal.value) return 0;
  return Math.max(
    ...proposal.value.space.strategies_parsed_metadata.map(metadata => metadata.decimals),
    0
  );
});

async function handleVoteClick(choice: Choice) {
  if (!web3.value.account) return (modalAccountOpen.value = true);

  selectedChoice.value = choice;
  modalOpenVote.value = true;
}

async function handleVoteSubmitted() {
  if (!proposal.value) return;

  selectedChoice.value = null;

  // TODO: Quick fix only for offchain proposals, need a more complete solution for onchain proposals
  if (offchainNetworks.includes(proposal.value.network)) {
    proposalsStore.fetchProposal(spaceAddress.value!, id.value, networkId.value!);
  }
}

function handleFetchVotingPower() {
  if (!proposal.value) return;

  fetchVotingPower(proposal.value);
}

watch(
  [proposal, () => web3.value.account, () => web3.value.authLoading],
  ([toProposal, toAccount, toAuthLoading], [, fromAccount, , ,]) => {
    if (fromAccount && toAccount && fromAccount !== toAccount) {
      resetVotingPower();
    }

    if (toAuthLoading || !toProposal || !toAccount) return;

    handleFetchVotingPower();
  },
  { immediate: true }
);

watch(
  [networkId, spaceAddress, id],
  async ([networkId, spaceAddress, id]) => {
    if (!networkId || !spaceAddress) return;

    proposalsStore.fetchProposal(spaceAddress, id, networkId);
  },
  { immediate: true }
);

watchEffect(() => {
  if (!resolved.value || !networkId.value || !spaceAddress.value) return;

  loadVotes(networkId.value, [spaceAddress.value]);
});

watchEffect(() => {
  if (!proposal.value) return;

  const faviconUrl = getStampUrl(
    offchainNetworks.includes(proposal.value.network) ? 'space' : 'space-sx',
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
        <div class="flex px-4 bg-skin-bg border-b sticky top-[71px] lg:top-[72px] z-40 space-x-3">
          <router-link
            :to="{
              name: 'proposal-overview',
              params: { id: proposal.proposal_id }
            }"
          >
            <UiLink :is-active="route.name === 'proposal-overview'" text="Overview" />
          </router-link>
          <router-link
            :to="{
              name: 'proposal-votes',
              params: { id: proposal.proposal_id }
            }"
            class="flex items-center"
          >
            <UiLink
              :is-active="route.name === 'proposal-votes'"
              :count="proposal.vote_count"
              text="Votes"
              class="inline-block"
            />
          </router-link>
          <a v-if="discussion" :href="discussion" target="_blank" class="flex items-center">
            <h4 class="eyebrow text-skin-text" v-text="'Discussion'" />
            <IH-arrow-sm-right class="-rotate-45 text-skin-text" />
          </a>
        </div>
        <router-view :proposal="proposal" />
      </div>
      <div
        class="static md:fixed md:top-[72px] md:right-0 w-full md:h-[calc(100vh-72px)] md:max-w-[340px] p-4 md:pb-[88px] border-l-0 md:border-l space-y-4 no-scrollbar overflow-y-scroll"
      >
        <div v-if="!proposal.cancelled && ['pending', 'active'].includes(proposal.state)">
          <h4 class="mb-2 eyebrow flex items-center">
            <IH-cursor-click class="inline-block mr-2" />
            <span>Cast your vote</span>
          </h4>
          <IndicatorVotingPower
            v-if="web3.account && networkId"
            v-slot="props"
            :network-id="networkId"
            :voting-power="votingPower"
            class="mb-2 flex items-center"
            @fetch-voting-power="handleFetchVotingPower"
          >
            <div
              v-if="
                votingPower &&
                votingPower.error?.details === 'NOT_READY_YET' &&
                ['evmSlotValue', 'ozVotesStorageProof'].includes(votingPower.error.source)
              "
            >
              <span class="inline-flex align-top h-[27px] items-center">
                <IH-exclamation-circle class="mr-1" />
              </span>
              Please allow few minutes for the voting power to be collected from Ethereum.
            </div>
            <template v-else>
              <span class="mr-1.5">Voting power:</span>
              <a @click="props.onClick">
                <UiLoading v-if="!votingPower || votingPower.status === 'loading'" />
                <IH-exclamation
                  v-else-if="votingPower.status === 'error'"
                  class="inline-block text-rose-500"
                />
                <span v-else class="text-skin-link" v-text="getFormattedVotingPower(votingPower)" />
              </a>
              <a
                v-if="votingPowerStatus === 'success' && props.votingPower === BigInt(0)"
                href="https://help.snapshot.org/en/articles/9566904-why-do-i-have-0-voting-power"
                target="_blank"
                class="ml-1.5"
              >
                <IH-exclamation-circle />
              </a>
            </template>
          </IndicatorVotingPower>
          <ProposalVote v-if="proposal" :proposal="proposal">
            <ProposalVoteBasic v-if="proposal.type === 'basic'" @vote="handleVoteClick" />
            <ProposalVoteSingleChoice
              v-else-if="proposal.type === 'single-choice'"
              :proposal="proposal"
              @vote="handleVoteClick"
            />
            <ProposalVoteApproval
              v-else-if="proposal.type === 'approval'"
              :proposal="proposal"
              @vote="handleVoteClick"
            />
            <ProposalVoteRankedChoice
              v-else-if="proposal.type === 'ranked-choice'"
              :proposal="proposal"
              @vote="handleVoteClick"
            />
            <ProposalVoteWeighted
              v-else-if="['weighted', 'quadratic'].includes(proposal.type)"
              :proposal="proposal"
              @vote="handleVoteClick"
            />
          </ProposalVote>
        </div>

        <div v-if="!proposal.cancelled && proposal.state !== 'pending' && proposal.vote_count">
          <h4 class="mb-2.5 eyebrow flex items-center">
            <IH-chart-square-bar class="inline-block mr-2" />
            <span>Results</span>
          </h4>
          <ProposalResults with-details :proposal="proposal" :decimals="votingPowerDecimals" />
        </div>
      </div>
    </template>
    <teleport to="#modal">
      <ModalVote
        v-if="proposal && selectedChoice"
        :choice="selectedChoice"
        :proposal="proposal"
        :open="modalOpenVote"
        @close="modalOpenVote = false"
        @voted="handleVoteSubmitted"
      />
    </teleport>
  </div>
</template>
