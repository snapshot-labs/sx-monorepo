<script setup lang="ts">
import { loadSingleTopic, Topic } from '@/helpers/discourse';
import {
  getCacheHash,
  getFormattedVotingPower,
  getStampUrl,
  sanitizeUrl
} from '@/helpers/utils';
import { offchainNetworks } from '@/networks';
import { Choice } from '@/types';

const route = useRoute();
const proposalsStore = useProposalsStore();
const {
  votingPower,
  fetch: fetchVotingPower,
  reset: resetVotingPower
} = useVotingPower();
const { setFavicon } = useFavicon();
const { param } = useRouteParser('space');
const { resolved, address: spaceAddress, networkId } = useResolve(param);
const { setTitle } = useTitle();
const { web3 } = useWeb3();
const { modalAccountOpen } = useModal();

const modalOpenVote = ref(false);
const selectedChoice = ref<Choice | null>(null);
const { loadVotes, votes } = useAccount();
const editMode = ref(false);
const discourseTopic: Ref<Topic | null> = ref(null);

const id = computed(() => route.params.id as string);
const proposal = computed(() => {
  if (!resolved.value || !spaceAddress.value || !networkId.value) {
    return null;
  }

  return proposalsStore.getProposal(
    spaceAddress.value,
    id.value,
    networkId.value
  );
});

const discussion = computed(() => {
  if (!proposal.value) return null;

  return sanitizeUrl(proposal.value.discussion);
});

const votingPowerDecimals = computed(() => {
  if (!proposal.value) return 0;
  return Math.max(
    ...proposal.value.space.strategies_parsed_metadata.map(
      metadata => metadata.decimals
    ),
    0
  );
});

const currentVote = computed(
  () =>
    proposal.value &&
    votes.value[`${proposal.value.network}:${proposal.value.id}`]
);

async function handleVoteClick(choice: Choice) {
  if (!web3.value.account) {
    modalAccountOpen.value = true;
    return;
  }

  selectedChoice.value = choice;
  modalOpenVote.value = true;
}

async function handleVoteSubmitted() {
  selectedChoice.value = null;
  editMode.value = false;
}

function handleFetchVotingPower() {
  if (!proposal.value) return;

  fetchVotingPower(proposal.value);
}

watch(
  [proposal, () => web3.value.account, () => web3.value.authLoading],
  ([toProposal, toAccount, toAuthLoading], [, fromAccount]) => {
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
    if (!resolved.value) {
      // NOTE: id's not updated in-sync with networkId and spaceAddress (those are resolved async)
      // we want to ignore updates if the values are not resolved yet
      return;
    }

    if (!networkId || !spaceAddress) return;

    modalOpenVote.value = false;
    editMode.value = false;
    await proposalsStore.fetchProposal(spaceAddress, id, networkId);

    if (discussion.value) {
      discourseTopic.value = await loadSingleTopic(discussion.value);
    }
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
  <div class="flex items-stretch md:flex-row flex-col w-full md:h-full">
    <UiLoading v-if="!proposal" class="ml-4 mt-3" />
    <template v-else>
      <div class="flex-1 grow min-w-0">
        <UiScrollerHorizontal
          class="z-40 sticky top-[71px] lg:top-[72px]"
          with-buttons
          gradient="xxl"
        >
          <div class="flex px-4 bg-skin-bg border-b space-x-3 min-w-max">
            <router-link
              :to="{
                name: 'proposal-overview',
                params: { id: proposal.proposal_id }
              }"
            >
              <UiLink
                :is-active="route.name === 'proposal-overview'"
                text="Overview"
              />
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
            <template v-if="discussion">
              <router-link
                v-if="discourseTopic?.posts_count"
                :to="{
                  name: 'proposal-discussion',
                  params: { id: proposal.proposal_id }
                }"
                class="flex items-center"
              >
                <UiLink
                  :is-active="route.name === 'proposal-discussion'"
                  :count="discourseTopic.posts_count"
                  text="Discussion"
                  class="inline-block"
                />
              </router-link>
              <a
                v-else
                :href="discussion"
                target="_blank"
                class="flex items-center"
              >
                <h4 class="eyebrow text-skin-text" v-text="'Discussion'" />
                <IH-arrow-sm-right class="-rotate-45 text-skin-text" />
              </a>
            </template>
          </div>
        </UiScrollerHorizontal>
        <router-view :proposal="proposal" />
      </div>
      <Affix
        :class="[
          'shrink-0 md:w-[340px] border-l-0 md:border-l',
          { 'hidden md:block': route.name === 'proposal-votes' }
        ]"
        :top="72"
        :bottom="64"
      >
        <div class="flex flex-col space-y-4 p-4">
          <div
            v-if="
              !proposal.cancelled &&
              ['pending', 'active'].includes(proposal.state)
            "
          >
            <h4 class="mb-2 eyebrow flex items-center space-x-2">
              <template v-if="editMode">
                <IH-cursor-click />
                <span>Edit your vote</span>
              </template>
              <template v-else-if="currentVote">
                <IH-check-circle />
                <span>Your vote</span>
              </template>
              <template v-else>
                <IH-cursor-click />
                <span>Cast your vote</span>
              </template>
            </h4>
            <IndicatorVotingPower
              v-if="web3.account && networkId && (!currentVote || editMode)"
              v-slot="props"
              :network-id="networkId"
              :voting-power="votingPower"
              class="mb-2 flex items-center"
              @fetch-voting-power="handleFetchVotingPower"
            >
              <div
                v-if="
                  votingPower?.error &&
                  votingPower.error.details === 'NOT_READY_YET' &&
                  ['evmSlotValue', 'ozVotesStorageProof'].includes(
                    votingPower.error.source
                  )
                "
              >
                <span class="inline-flex align-top h-[27px] items-center">
                  <IH-exclamation-circle class="mr-1" />
                </span>
                Please allow few minutes for the voting power to be collected
                from Ethereum.
              </div>
              <template v-else>
                <span class="mr-1.5">Voting power:</span>
                <button type="button" @click="props.onClick">
                  <UiLoading
                    v-if="!votingPower || votingPower.status === 'loading'"
                  />
                  <IH-exclamation
                    v-else-if="votingPower.status === 'error'"
                    class="inline-block text-rose-500"
                  />
                  <span
                    v-else
                    class="text-skin-link"
                    v-text="getFormattedVotingPower(votingPower)"
                  />
                </button>
                <a
                  v-if="
                    votingPower?.status === 'success' &&
                    votingPower.totalVotingPower === BigInt(0)
                  "
                  href="https://help.snapshot.org/en/articles/9566904-why-do-i-have-0-voting-power"
                  target="_blank"
                  class="ml-1.5"
                >
                  <IH-question-mark-circle />
                </a>
              </template>
            </IndicatorVotingPower>
            <ProposalVote
              v-if="proposal"
              :proposal="proposal"
              :edit-mode="editMode"
              @enter-edit-mode="editMode = true"
            >
              <ProposalVoteBasic
                v-if="proposal.type === 'basic'"
                @vote="handleVoteClick"
              />
              <ProposalVoteSingleChoice
                v-else-if="proposal.type === 'single-choice'"
                :proposal="proposal"
                :default-choice="currentVote?.choice"
                @vote="handleVoteClick"
              />
              <ProposalVoteApproval
                v-else-if="proposal.type === 'approval'"
                :proposal="proposal"
                :default-choice="currentVote?.choice"
                @vote="handleVoteClick"
              />
              <ProposalVoteRankedChoice
                v-else-if="proposal.type === 'ranked-choice'"
                :proposal="proposal"
                :default-choice="currentVote?.choice"
                @vote="handleVoteClick"
              />
              <ProposalVoteWeighted
                v-else-if="['weighted', 'quadratic'].includes(proposal.type)"
                :proposal="proposal"
                :default-choice="currentVote?.choice"
                @vote="handleVoteClick"
              />
            </ProposalVote>
          </div>
          <div
            v-if="
              !proposal.cancelled &&
              proposal.state !== 'pending' &&
              proposal.vote_count
            "
          >
            <h4 class="mb-2.5 eyebrow flex items-center gap-2">
              <IH-chart-square-bar />
              Results
            </h4>
            <ProposalResults
              with-details
              :proposal="proposal"
              :decimals="votingPowerDecimals"
            />
          </div>
          <div>
            <h4 class="mb-2.5 eyebrow flex items-center gap-2">
              <IH-clock />
              Timeline
            </h4>
            <ProposalTimeline :data="proposal" />
          </div>
        </div>
      </Affix>
    </template>
    <teleport to="#modal">
      <ModalVote
        v-if="proposal"
        :choice="selectedChoice"
        :proposal="proposal"
        :open="modalOpenVote"
        @close="modalOpenVote = false"
        @voted="handleVoteSubmitted"
      />
    </teleport>
  </div>
</template>
