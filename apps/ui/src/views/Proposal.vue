<script setup lang="ts">
import { loadSingleTopic, Topic } from '@/helpers/discourse';
import { getFormattedVotingPower, sanitizeUrl } from '@/helpers/utils';
import { Choice, Space } from '@/types';

const props = defineProps<{
  space: Space;
}>();

const route = useRoute();
const proposalsStore = useProposalsStore();
const {
  votingPower,
  fetch: fetchVotingPower,
  reset: resetVotingPower
} = useVotingPower();
const { setTitle } = useTitle();
const { web3 } = useWeb3();
const { modalAccountOpen } = useModal();

const modalOpenVote = ref(false);
const selectedChoice = ref<Choice | null>(null);
const { votes } = useAccount();
const editMode = ref(false);
const discourseTopic: Ref<Topic | null> = ref(null);

const id = computed(() => route.params.proposal as string);
const proposal = computed(() => {
  return proposalsStore.getProposal(
    props.space.id,
    id.value,
    props.space.network
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
  id,
  async id => {
    modalOpenVote.value = false;
    editMode.value = false;
    await proposalsStore.fetchProposal(props.space.id, id, props.space.network);

    if (discussion.value) {
      discourseTopic.value = await loadSingleTopic(discussion.value);
    }
  },
  { immediate: true }
);

watchEffect(() => {
  if (!proposal.value) return;

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
            <AppLink
              :to="{
                name: 'space-proposal-overview',
                params: {
                  proposal: proposal.proposal_id,
                  space: `${proposal.network}:${proposal.space.id}`
                }
              }"
            >
              <UiLink
                :is-active="route.name === 'space-proposal-overview'"
                text="Overview"
              />
            </AppLink>
            <AppLink
              :to="{
                name: 'space-proposal-votes',
                params: {
                  proposal: proposal.proposal_id,
                  space: `${proposal.network}:${proposal.space.id}`
                }
              }"
              class="flex items-center"
            >
              <UiLink
                :is-active="route.name === 'space-proposal-votes'"
                :count="proposal.vote_count"
                text="Votes"
                class="inline-block"
              />
            </AppLink>
            <template v-if="discussion">
              <AppLink
                v-if="discourseTopic?.posts_count"
                :to="{
                  name: 'space-proposal-discussion',
                  params: {
                    proposal: proposal.proposal_id,
                    space: `${proposal.network}:${proposal.space.id}`
                  }
                }"
                class="flex items-center"
              >
                <UiLink
                  :is-active="route.name === 'space-proposal-discussion'"
                  :count="discourseTopic.posts_count"
                  text="Discussion"
                  class="inline-block"
                />
              </AppLink>
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
          { 'hidden md:block': route.name === 'space-proposal-votes' }
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
              v-if="web3.account && (!currentVote || editMode)"
              v-slot="votingPowerProps"
              :network-id="proposal.network"
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
                <button type="button" @click="votingPowerProps.onClick">
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
                  href="https://help.snapshot.box/en/articles/9566904-why-do-i-have-0-voting-power"
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
                :choices="proposal.choices"
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
          <ProposalLabels
            v-if="space.labels?.length && proposal.labels?.length"
            :proposal-labels="proposal.labels"
            :space-labels="space.labels"
          />
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
