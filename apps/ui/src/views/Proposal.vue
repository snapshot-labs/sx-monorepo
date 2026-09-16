<script setup lang="ts">
import { getBoostsCount } from '@/helpers/boost';
import { DOCS_URL, FLAGS } from '@/helpers/constants';
import { loadSingleTopic, Topic } from '@/helpers/discourse';
import { teVoteWeight, totalVotingPower } from '@/helpers/teVoteWeight';
import { getFormattedVotingPower, sanitizeUrl } from '@/helpers/utils';
import { useProposalQuery } from '@/queries/proposals';
import { useProposalVotingPowerQuery } from '@/queries/votingPower';
import { Choice, Space } from '@/types';
import { TOTAL_NAV_HEIGHT } from '../../tailwind.config';

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

const router = useRouter();

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

/**
 * What a private proposal will actually count this voter as.
 *
 * Private voting counts in whole numbers and caps them, so voting power is not
 * used as given — and until now the voter only found out afterwards: the clamp
 * appeared in the verify panel once the tally was published, and the floor
 * appeared as a rejection *after* they had chosen and signed. Surfacing it beside
 * their voting power turns both into something they know before committing.
 *
 * Advisory only; the sequencer is what enforces either rule.
 */
const teWeightNotice = computed(() => {
  if (proposal.value?.privacy !== 'shutter-elgamal') return null;
  if (isVotingPowerPending.value || isVotingPowerError.value) return null;

  const vp = totalVotingPower(votingPower.value);
  if (vp === null) return null;

  // `scale` rides on the proposal's frozen TE config; absent means 1, i.e. no
  // scaling, which is the case for essentially every space.
  const scale = Number((proposal.value as any).te_config?.scale ?? 1);
  const result = teVoteWeight(vp, scale);
  return result.kind === 'ok' ? null : result;
});

const currentVote = computed(
  () =>
    proposal.value &&
    votes.value[`${proposal.value.network}:${proposal.value.id}`]
);

const withoutContentInBottom = computed(() =>
  String(route.name).endsWith('proposal-votes')
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
  [id, proposal, isPending],
  async ([id, proposal, isPending]) => {
    modalOpenVote.value = false;
    editMode.value = false;
    discourseTopic.value = null;
    boostCount.value = 0;

    if (!isPending && !proposal) {
      router.push({
        name: 'space-overview',
        params: { space: `${props.space.network}:${props.space.id}` }
      });
      return;
    }

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
          class="z-40 sticky top-header-height-with-offset lg:top-header-height"
          with-buttons
          gradient="xxl"
          data-testid="proposal-tabs"
        >
          <div class="flex px-4 bg-skin-bg border-b space-x-3 min-w-max">
            <AppLink
              v-slot="{ isExactActive }"
              :to="{
                name: 'space-proposal-overview',
                params: {
                  proposal: proposal.proposal_id,
                  space: `${proposal.network}:${proposal.space.id}`
                }
              }"
            >
              <UiLabel :is-active="isExactActive" text="Overview" />
            </AppLink>
            <AppLink
              v-if="proposal.vote_count"
              v-slot="{ isExactActive }"
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
                :is-active="isExactActive"
                :count="proposal.vote_count"
                text="Votes"
                class="inline-block"
              />
            </AppLink>
            <AppLink
              v-if="proposal.executions?.length"
              v-slot="{ isExactActive }"
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
                :is-active="isExactActive"
                :count="
                  proposal.executions
                    .map(execution => execution.transactions.length)
                    .reduce((a, b) => a + b, 0)
                "
                text="Execution"
                class="inline-block"
              />
            </AppLink>
            <template v-if="discussion">
              <AppLink
                v-if="discourseTopic?.posts_count"
                v-slot="{ isExactActive }"
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
                  :is-active="isExactActive"
                  :count="discourseTopic.posts_count"
                  text="Discussion"
                  class="inline-block"
                />
              </AppLink>
              <AppLink v-else :to="discussion" class="flex items-center">
                <UiEyebrow class="text-skin-text">Discussion</UiEyebrow>
                <IH-arrow-sm-right class="-rotate-45 text-skin-text" />
              </AppLink>
            </template>
            <template v-if="boostCount > 0">
              <AppLink
                :to="`https://v1.snapshot.box/#/${proposal.space.id}/proposal/${proposal.proposal_id}`"
                class="flex items-center"
              >
                <UiLabel
                  :count="boostCount"
                  text="Boost"
                  class="inline-block"
                />
              </AppLink>
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
          'shrink-0 md:h-full z-40 border-l-0 md:border-l bg-skin-bg',
          {
            'hidden md:block': withoutContentInBottom
          }
        ]"
      >
        <UiAffix
          data-testid="proposal-sidebar"
          :top="TOTAL_NAV_HEIGHT"
          :bottom="64"
        >
          <div v-bind="$attrs" class="flex flex-col space-y-4 p-4 pb-0 !h-auto">
            <div
              v-if="
                (!proposal.cancelled &&
                  ['pending', 'active'].includes(proposal.state)) ||
                currentVote
              "
            >
              <UiEyebrow class="mb-2.5 flex items-center space-x-2">
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
              </UiEyebrow>
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
                      :to="`${DOCS_URL}/faq#why-is-my-voting-power-equal-to-0`"
                    >
                      <IH-question-mark-circle />
                    </AppLink>
                  </div>
                </IndicatorVotingPower>
                <!--
                  Private voting counts whole numbers and caps them, so say so
                  before the voter picks choices and signs rather than after.
                  Advisory: the sequencer enforces both rules at ingest.
                -->
                <div
                  v-if="teWeightNotice"
                  class="flex gap-2 rounded-lg border px-3 py-2 text-[13px] leading-snug"
                  :class="
                    teWeightNotice.kind === 'dust'
                      ? 'border-skin-danger/30 text-skin-danger'
                      : 'border-skin-border text-skin-text'
                  "
                >
                  <IH-exclamation-circle
                    class="mt-[3px] size-[14px] shrink-0"
                  />
                  <span v-if="teWeightNotice.kind === 'dust'">
                    <b>You can't vote on this proposal.</b> Private voting needs
                    at least 0.5 voting power.
                  </span>
                  <span v-else-if="teWeightNotice.kind === 'zero-scaled'">
                    <b>Your vote would not move this tally.</b> This proposal
                    counts in units of
                    <b
                      class="text-skin-link"
                      v-text="teWeightNotice.scale.toLocaleString()"
                    />, and your voting power rounds to zero at that size. Your
                    ballot will still be recorded.
                  </span>
                  <span v-else>
                    Counted as
                    <b
                      class="text-skin-link"
                      v-text="teWeightNotice.counted.toLocaleString()"
                    />. This proposal counts in units of
                    <b v-text="teWeightNotice.scale.toLocaleString()" />, so
                    every voter's power is divided by the same amount.
                  </span>
                </div>
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
              <UiEyebrow class="mb-2.5 flex items-center gap-2">
                <IH-chart-square-bar />
                Results
              </UiEyebrow>
              <ProposalResults
                with-details
                :proposal="proposal"
                :decimals="votingPowerDecimals"
              />
            </div>
            <div v-if="space.labels?.length && proposal.labels?.length">
              <UiEyebrow class="mb-2.5 flex items-center gap-2">
                <IH-tag />
                Labels
              </UiEyebrow>
              <ProposalLabels
                :space-id="`${space.network}:${space.id}`"
                :space-labels="space.labels"
                :labels="proposal.labels"
                with-link
              />
            </div>
            <div>
              <UiEyebrow class="mb-2.5 flex items-center gap-2">
                <IH-clock />
                Timeline
              </UiEyebrow>
              <ProposalTimeline :data="proposal" />
            </div>
          </div>
        </UiAffix>
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
