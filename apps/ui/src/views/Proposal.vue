<script setup lang="ts">
import { getBoostsCount } from '@/helpers/boost';
import { FLAGS, HELPDESK_URL } from '@/helpers/constants';
import { loadSingleTopic, Topic } from '@/helpers/discourse';
import { getFormattedVotingPower, sanitizeUrl } from '@/helpers/utils';
import { useProposalQuery } from '@/queries/proposals';
import { useProposalVotingPowerQuery } from '@/queries/votingPower';
import { Choice, Space } from '@/types';

const props = defineProps<{
  space: Space;
}>();

defineOptions({ inheritAttrs: false });

const route = useRoute();
const { setTitle } = useTitle();
const { web3 } = useWeb3();
const { modalAccountOpen } = useModal();
const termsStore = useTermsStore();

const modalOpenVote = ref(false);
const modalOpenTerms = ref(false);
const selectedChoice = ref<Choice | null>(null);
const { votes } = useAccount();
const editMode = ref(false);
const discourseTopic: Ref<Topic | null> = ref(null);
const boostCount = ref(0);

const id = computed(() => route.params.proposal as string);

const { data: proposal, isPending } = useProposalQuery(
  props.space.network,
  props.space.id,
  id
);

const {
  data: votingPower,
  error: votingPowerError,
  isPending: isVotingPowerPending,
  isError: isVotingPowerError,
  refetch: fetchVotingPower
} = useProposalVotingPowerQuery(
  toRef(() => web3.value.account),
  toRef(() => proposal.value),
  toRef(() => ['active', 'pending'].includes(proposal.value?.state || ''))
);

const discussion = computed(() => {
  if (!proposal.value) return null;

  return sanitizeUrl(proposal.value.discussion);
});

const votingPowerDecimals = computed(() => proposal.value?.vp_decimals ?? 0);

const currentVote = computed(
  () =>
    proposal.value &&
    votes.value[`${proposal.value.network}:${proposal.value.id}`]
);

const withoutContentInBottom = computed(
  () => 'space-proposal-votes' === String(route.name)
);

async function handleVoteClick(choice: Choice) {
  if (!web3.value.account) {
    modalAccountOpen.value = true;
    return;
  }

  selectedChoice.value = choice;

  if (props.space.terms && !termsStore.areAccepted(props.space)) {
    modalOpenTerms.value = true;
    return;
  }

  modalOpenVote.value = true;
}

function handleAcceptTerms() {
  termsStore.accept(props.space);
  handleVoteClick(selectedChoice.value!);
}

async function handleVoteSubmitted() {
  selectedChoice.value = null;
  editMode.value = false;
}

watch(
  [id, proposal],
  async ([id, proposal]) => {
    modalOpenVote.value = false;
    editMode.value = false;
    discourseTopic.value = null;
    boostCount.value = 0;

    if (!proposal) return;

    if (discussion.value) {
      loadSingleTopic(discussion.value).then(result => {
        discourseTopic.value = result;
      });
    }

    if (props.space.additionalRawData?.boost?.enabled) {
      const bribeEnabled =
        props.space.additionalRawData.boost.bribeEnabled || false;
      const proposalEnd = proposal.max_end || 0;
      getBoostsCount(id, bribeEnabled, proposalEnd).then(result => {
        boostCount.value = result;
      });
    }
  },
  { immediate: true }
);

watchEffect(() => {
  if (!proposal.value) return;

  setTitle(
    (proposal.value.flag_code !== FLAGS.DMCA && proposal.value.title) ||
      `Proposal #${proposal.value.proposal_id}`
  );
});
</script>

<template>
  <div class="flex items-stretch md:flex-row flex-col w-full h-full">
    <UiLoading v-if="isPending" class="ml-4 mt-3" />
    <template v-else-if="proposal">
      <div
        :class="[
          'flex-1 grow min-w-0',
          { 'max-md:pb-0': !withoutContentInBottom }
        ]"
        v-bind="$attrs"
      >
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
              <UiLabel
                :is-active="route.name === 'space-proposal-overview'"
                text="Overview"
              />
            </AppLink>
            <AppLink
              v-if="
                proposal.executions?.length ||
                proposal.execution_strategy_type === 'safeSnap'
              "
              :to="{
                name: 'space-proposal-execution',
                params: {
                  proposal: proposal.proposal_id,
                  space: `${proposal.network}:${proposal.space.id}`
                }
              }"
              class="flex items-center"
            >
              <UiLabel
                :is-active="route.name === 'space-proposal-execution'"
                :count="
                  proposal.executions
                    .map(execution => execution.transactions.length)
                    .reduce((a, b) => a + b, 0)
                "
                text="Execution"
                class="inline-block"
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
              <UiLabel
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
                <UiLabel
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
            <template v-if="boostCount > 0">
              <a
                :href="`https://v1.snapshot.box/#/${proposal.space.id}/proposal/${proposal.proposal_id}`"
                class="flex items-center"
                target="_blank"
              >
                <UiLabel
                  :count="boostCount"
                  text="Boost"
                  class="inline-block"
                />
              </a>
            </template>
          </div>
        </UiScrollerHorizontal>
        <router-view :proposal="proposal" />
      </div>

      <UiResizableHorizontal
        id="proposal-sidebar"
        :default="340"
        :max="440"
        :min="340"
        :class="[
          'shrink-0 md:h-full z-40 border-l-0 md:border-l',
          {
            'hidden md:block': route.name === 'space-proposal-votes'
          }
        ]"
      >
        <Affix :top="72" :bottom="64">
          <div v-bind="$attrs" class="flex flex-col space-y-4 p-4 pb-0 !h-auto">
            <div
              v-if="
                (!proposal.cancelled &&
                  ['pending', 'active'].includes(proposal.state)) ||
                currentVote
              "
            >
              <h4 class="mb-2.5 eyebrow flex items-center space-x-2">
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
              <div class="space-y-2">
                <IndicatorVotingPower
                  v-if="
                    (!currentVote || editMode) &&
                    ['pending', 'active'].includes(proposal.state)
                  "
                  v-slot="votingPowerProps"
                  :network-id="proposal.network"
                  :voting-power="votingPower"
                  :is-loading="isVotingPowerPending"
                  :is-error="isVotingPowerError"
                  @fetch="fetchVotingPower"
                >
                  <div v-if="votingPowerError?.message === 'NOT_READY_YET'">
                    <IH-exclamation-circle
                      class="mr-1 -mt-1 inline-block h-[27px]"
                    />
                    Please allow a few minutes for the voting power to be
                    computed.
                  </div>
                  <div v-else class="flex gap-1.5 items-center">
                    <span class="shrink-0">Voting power:</span>
                    <button
                      type="button"
                      class="truncate"
                      :disabled="isVotingPowerPending"
                      :class="{
                        'cursor-not-allowed': isVotingPowerPending
                      }"
                      @click="votingPowerProps.onClick"
                    >
                      <UiLoading v-if="isVotingPowerPending" />
                      <IH-exclamation
                        v-else-if="isVotingPowerError"
                        class="inline-block text-rose-500"
                      />
                      <span
                        v-else
                        class="text-skin-link"
                        v-text="getFormattedVotingPower(votingPower)"
                      />
                    </button>
                    <AppLink
                      v-if="
                        votingPower?.votingPowers?.every(v => v.value === 0n)
                      "
                      :to="`${HELPDESK_URL}/en/articles/9566904-why-do-i-have-0-voting-power`"
                    >
                      <IH-question-mark-circle />
                    </AppLink>
                  </div>
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
                    v-else-if="
                      ['ranked-choice', 'copeland'].includes(proposal.type)
                    "
                    :proposal="proposal"
                    :default-choice="currentVote?.choice"
                    @vote="handleVoteClick"
                  />
                  <ProposalVoteWeighted
                    v-else-if="
                      ['weighted', 'quadratic'].includes(proposal.type)
                    "
                    :proposal="proposal"
                    :default-choice="currentVote?.choice"
                    @vote="handleVoteClick"
                  />
                </ProposalVote>
              </div>
            </div>
            <div v-if="!proposal.cancelled">
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
            <div v-if="space.labels?.length && proposal.labels?.length">
              <h4 class="mb-2.5 eyebrow flex items-center gap-2">
                <IH-tag />
                Labels
              </h4>
              <ProposalLabels
                :space-id="`${space.network}:${space.id}`"
                :space-labels="space.labels"
                :labels="proposal.labels"
                with-link
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
      </UiResizableHorizontal>
    </template>
    <teleport to="#modal">
      <ModalTerms
        v-if="space.terms"
        :open="modalOpenTerms"
        :space="space"
        @close="modalOpenTerms = false"
        @accept="handleAcceptTerms"
      />
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
