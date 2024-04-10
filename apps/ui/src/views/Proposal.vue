<script setup lang="ts">
import { utils } from '@snapshot-labs/sx';
import { getNetwork, offchainNetworks } from '@/networks';
import { getStampUrl, getCacheHash, sanitizeUrl } from '@/helpers/utils';
import { Choice } from '@/types';
import { VotingPower, VotingPowerStatus } from '@/networks/types';

const route = useRoute();
const { setFavicon } = useFavicon();
const { param } = useRouteParser('space');
const { resolved, address: spaceAddress, networkId } = useResolve(param);
const { setTitle } = useTitle();
const proposalsStore = useProposalsStore();
const { web3 } = useWeb3();
const { loadVotes } = useAccount();
const { vote } = useActions();

const sendingType = ref<Choice | null>(null);
const votingPowers = ref([] as VotingPower[]);
const votingPowerStatus = ref<VotingPowerStatus>('loading');
const votingPowerDetailsError = ref<utils.errors.VotingPowerDetailsError | null>(null);

const network = computed(() => (networkId.value ? getNetwork(networkId.value) : null));
const id = computed(() => route.params.id as string);
const proposal = computed(() => {
  if (!resolved.value || !spaceAddress.value || !networkId.value) {
    return null;
  }

  return proposalsStore.getProposal(spaceAddress.value, id.value, networkId.value);
});

const discussion = computed(() => {
  return sanitizeUrl(proposal.value.discussion);
});

const votingPowerDecimals = computed(() => {
  if (!proposal.value) return 0;
  return Math.max(
    ...proposal.value.space.strategies_parsed_metadata.map(metadata => metadata.decimals),
    0
  );
});

async function getVotingPower() {
  if (!network.value) return;

  votingPowerDetailsError.value = null;

  if (!web3.value.account || !proposal.value) {
    votingPowers.value = [];
    votingPowerStatus.value = 'success';
    return;
  }

  votingPowerStatus.value = 'loading';
  try {
    votingPowers.value = await network.value.actions.getVotingPower(
      proposal.value.space.id,
      proposal.value.strategies,
      proposal.value.strategies_params,
      proposal.value.space.strategies_parsed_metadata,
      web3.value.account,
      { at: proposal.value.snapshot, chainId: proposal.value.space.snapshot_chain_id }
    );
    votingPowerStatus.value = 'success';
  } catch (e: unknown) {
    if (e instanceof utils.errors.VotingPowerDetailsError) {
      votingPowerDetailsError.value = e;
    } else {
      console.warn('Failed to load voting power', e);
    }

    votingPowers.value = [];
    votingPowerStatus.value = 'error';
  }
}

async function handleVoteClick(choice: Choice) {
  if (!proposal.value) return;

  sendingType.value = choice;

  try {
    await vote(proposal.value, choice);
    // TODO: Quick fix only for offchain proposals, need a more complete solution for onchain proposals
    if (offchainNetworks.includes(proposal.value.network)) {
      proposalsStore.fetchProposal(spaceAddress.value!, id.value, networkId.value!);
    }
  } finally {
    sendingType.value = null;
  }
}

watch([() => web3.value.account, proposal], () => getVotingPower());
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

  loadVotes(networkId.value, spaceAddress.value);
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
            :status="votingPowerStatus"
            :voting-power-symbol="proposal.space.voting_power_symbol"
            :voting-powers="votingPowers"
            class="mb-2 flex items-center"
            @get-voting-power="getVotingPower"
          >
            <div
              v-if="
                votingPowerDetailsError?.details === 'NOT_READY_YET' &&
                ['evmSlotValue', 'ozVotesStorageProof'].includes(votingPowerDetailsError.source)
              "
              class="mt-2"
            >
              <span class="inline-flex align-top h-[27px] items-center">
                <IH-exclamation-circle class="mr-1" />
              </span>
              Please allow few minutes for the voting power to be collected from Ethereum.
            </div>
            <template v-else>
              <span class="mr-1.5">Voting power:</span>
              <a @click="props.onClick">
                <UiLoading v-if="votingPowerStatus === 'loading'" />
                <IH-exclamation
                  v-else-if="votingPowerStatus === 'error'"
                  class="inline-block text-rose-500"
                />
                <span v-else class="text-skin-link" v-text="props.formattedVotingPower" />
              </a>
            </template>
          </IndicatorVotingPower>
          <ProposalVote v-if="proposal" :proposal="proposal">
            <ProposalVoteBasic
              v-if="proposal.type === 'basic'"
              :sending-type="sendingType"
              @vote="handleVoteClick"
            />
            <ProposalVoteSingleChoice
              v-else-if="proposal.type === 'single-choice'"
              :proposal="proposal"
              :sending-type="sendingType"
              @vote="handleVoteClick"
            />
            <ProposalVoteApproval
              v-else-if="proposal.type === 'approval'"
              :proposal="proposal"
              :sending-type="sendingType"
              @vote="handleVoteClick"
            />
            <ProposalVoteRankedChoice
              v-else-if="proposal.type === 'ranked-choice'"
              :proposal="proposal"
              :sending-type="sendingType"
              @vote="handleVoteClick"
            />
            <ProposalVoteWeighted
              v-else-if="['weighted', 'quadratic'].includes(proposal.type)"
              :proposal="proposal"
              :sending-type="sendingType"
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
  </div>
</template>
