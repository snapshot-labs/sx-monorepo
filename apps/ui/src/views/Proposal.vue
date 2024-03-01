<script setup lang="ts">
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
const { vote } = useActions();

const sendingType = ref<Choice | null>(null);
const votingPowers = ref([] as VotingPower[]);
const votingPowerStatus = ref<VotingPowerStatus>('loading');

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

  if (!web3.value.account || !proposal.value) {
    votingPowers.value = [];
    votingPowerStatus.value = 'success';
    return;
  }

  votingPowerStatus.value = 'loading';
  try {
    votingPowers.value = await network.value.actions.getVotingPower(
      proposal.value.strategies,
      proposal.value.strategies_params,
      proposal.value.space.strategies_parsed_metadata,
      web3.value.account,
      { at: proposal.value.snapshot, chainId: proposal.value.space.snapshot_chain_id }
    );
    votingPowerStatus.value = 'success';
  } catch (e) {
    console.warn('Failed to load voting power', e);
    votingPowers.value = [];
    votingPowerStatus.value = 'error';
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
  async ([networkId, spaceAddress, id]) => {
    if (!networkId || !spaceAddress) return;

    proposalsStore.fetchProposal(spaceAddress, id, networkId);
  },
  { immediate: true }
);

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
        class="static md:fixed md:top-[72px] md:right-0 w-full md:h-screen md:max-w-[340px] p-4 border-l"
      >
        <template v-if="!proposal.cancelled && ['pending', 'active'].includes(proposal.state)">
          <IndicatorVotingPower
            v-if="web3.account && networkId"
            v-slot="props"
            :network-id="networkId"
            :status="votingPowerStatus"
            :voting-power-symbol="proposal.space.voting_power_symbol"
            :voting-powers="votingPowers"
            class="mb-2 mt-4 first:mt-1"
            @get-voting-power="getVotingPower"
          >
            <h4 class="block eyebrow">Your voting power</h4>
            <div class="pt-2">
              <UiLoading v-if="votingPowerStatus === 'loading'" />
              <button v-else class="text-skin-link text-lg" @click="props.onClick">
                <IH-exclamation v-if="votingPowerStatus === 'error'" class="inline-block mr-1" />
                {{ props.formattedVotingPower }}
              </button>
            </div>
          </IndicatorVotingPower>

          <h4 class="block eyebrow mb-2 mt-4 first:mt-1">Cast your vote</h4>
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
          </ProposalVote>
        </template>

        <template v-if="!proposal.cancelled && proposal.state !== 'pending' && proposal.vote_count">
          <h4 class="block eyebrow mb-2 mt-4 first:mt-1">Results</h4>
          <ProposalResults with-details :proposal="proposal" :decimals="votingPowerDecimals" />
        </template>
      </div>
    </template>
  </div>
</template>
