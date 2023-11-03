<script setup lang="ts">
import { getNetwork, offchainNetworks } from '@/networks';
import { getStampUrl, getCacheHash } from '@/helpers/utils';
import { Choice } from '@/types';
import { VotingPower } from '@/networks/types';

const route = useRoute();
const { setFavicon } = useFavicon();
const { param } = useRouteParser('space');
const { resolved, address: spaceAddress, networkId } = useResolve(param);
const { setTitle } = useTitle();
const proposalsStore = useProposalsStore();
const { web3 } = useWeb3();
const { vote } = useActions();

const sendingType = ref<null | number>(null);
const votingPowers = ref([] as VotingPower[]);
const loadingVotingPower = ref(true);

const network = computed(() => (networkId.value ? getNetwork(networkId.value) : null));
const id = computed(() => route.params.id as string);
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

async function getVotingPower() {
  if (!network.value) return;

  if (!web3.value.account || !proposal.value) {
    votingPowers.value = [];
    loadingVotingPower.value = false;
    return;
  }

  loadingVotingPower.value = true;
  try {
    votingPowers.value = await network.value.actions.getVotingPower(
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
        <div class="flex px-4 bg-skin-bg border-b sticky top-[72px] z-40">
          <router-link
            :to="{
              name: 'proposal-overview',
              params: { id: proposal.proposal_id }
            }"
          >
            <Link :is-active="route.name === 'proposal-overview'" text="Overview" class="pr-3" />
          </router-link>
          <router-link
            :to="{
              name: 'proposal-votes',
              params: { id: proposal.proposal_id }
            }"
          >
            <Link :is-active="route.name === 'proposal-votes'" text="Votes" />
          </router-link>
        </div>
        <router-view :proposal="proposal" />
      </div>
      <div
        class="static md:fixed md:top-[72px] md:right-0 w-full md:h-screen md:max-w-[340px] p-4 border-l"
      >
        <template v-if="!proposal.cancelled && !proposal.has_ended && !network?.readOnly">
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
                  <IH-minus-sm class="inline-block" />
                </UiButton>
              </UiTooltip>
            </div>
          </Vote>
        </template>

        <template v-if="!proposal.cancelled && proposal.has_started">
          <h4 class="block eyebrow mb-2 mt-4 first:mt-1">Results</h4>
          <Results with-details :proposal="proposal" :decimals="votingPowerDecimals" />
        </template>
      </div>
    </template>
  </div>
</template>
