<script setup lang="ts">
import { sanitizeUrl } from '@braintree/sanitize-url';
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { useQueryClient } from '@tanstack/vue-query';
import { LocationQueryValue } from 'vue-router';
import { StrategyWithTreasury } from '@/composables/useTreasuries';
import { BASIC_CHOICES, VERIFIED_URL } from '@/helpers/constants';
import { omit, prettyConcat } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import { getNetwork, offchainNetworks } from '@/networks';
import { PROPOSALS_KEYS } from '@/queries/proposals';
import { usePropositionPowerQuery } from '@/queries/propositionPower';
import { Contact, Space, Transaction, VoteType } from '@/types';
import { TOTAL_NAV_HEIGHT } from '../../../tailwind.config';

const DEFAULT_VOTING_DELAY = 60 * 60 * 24 * 3;

const TITLE_DEFINITION = {
  type: 'string',
  title: 'Title',
  minLength: 1,
  maxLength: 256
};

const DISCUSSION_DEFINITION = {
  type: 'string',
  format: 'uri',
  title: 'Discussion',
  maxLength: 256,
  examples: ['e.g. https://forum.balancer.fi/t/proposal…']
};

const props = defineProps<{
  space: Space;
}>();

defineOptions({ inheritAttrs: false });

const { setTitle } = useTitle();
const queryClient = useQueryClient();
const uiStore = useUiStore();
const { proposals, createDraft, refreshDrafts } = useEditor();
const route = useRoute();
const router = useRouter();
const { propose, updateProposal } = useActions();
const { web3 } = useWeb3();
const {
  spaceKey: walletConnectSpaceKey,
  network: walletConnectNetwork,
  transaction,
  executionStrategy: walletConnectTransactionExecutionStrategy,
  reset
} = useWalletConnectTransaction();
const { strategiesWithTreasuries } = useTreasuries(props.space);
const termsStore = useTermsStore();
const timestamp = useTimestamp({ interval: 1000 });
const { limits, lists } = useSettings();
const { isWhiteLabel } = useWhiteLabel();
const { alerts } = useSpaceAlerts(toRef(props, 'space'), {
  isEditor: true
});
const { isController, isAdmin } = useSpaceSettings(toRef(props, 'space'));
const { isInvalidNetwork: isSafeInvalidNetwork } = useSafeWallet(
  props.space.network,
  props.space.snapshot_chain_id
);

const modalOpen = ref(false);
const modalOpenTerms = ref(false);
const { modalAccountOpen } = useModal();
const previewEnabled = ref(false);
const sending = ref(false);
const enforcedVoteType = ref<VoteType | null>(null);

const nonPremiumNetworksList = computed(() => {
  const networks = alerts.value.get('HAS_PRO_ONLY_NETWORKS')?.networks;
  if (!networks) return '';
  const boldNames = networks.map((n: any) => `<b>${n.name}</b>`);
  return prettyConcat(boldNames, 'and');
});

const disabledStrategiesList = computed(() => {
  return (
    alerts.value
      .get('HAS_DISABLED_STRATEGIES')
      ?.strategies?.map((n: any) => `<b>${n}</b>`) || []
  );
});

const unsupportedPremiumStrategiesList = computed(() => {
  return (
    alerts.value
      .get('HAS_PRO_ONLY_STRATEGIES')
      ?.strategies?.map((n: any) => `<b>${n}</b>`) || []
  );
});

const privacy = computed({
  get() {
    return proposal.value?.privacy === 'shutter';
  },
  set(value) {
    if (proposal.value) {
      proposal.value.privacy = value ? 'shutter' : 'none';
    }
  }
});
const draftId = computed(() => route.params.key as string);
const network = computed(() => getNetwork(props.space.network));
const spaceKey = computed(() => `${props.space.network}:${props.space.id}`);
const proposalKey = computed(() => `${spaceKey.value}:${draftId.value}`);
const proposal = computedAsync(async () => {
  if (!proposalKey.value) return null;

  if (!proposals[proposalKey.value]) {
    await createDraft(spaceKey.value, undefined, draftId.value);
  }

  return proposals[proposalKey.value];
});
const proposalData = computed(() => {
  if (!proposal.value) return null;

  return JSON.stringify(omit(proposal.value, ['updatedAt']));
});
const isOffchainSpace = computed(() =>
  offchainNetworks.includes(props.space.network)
);

const supportsMultipleTreasuries = computed(() => isOffchainSpace.value);

const editorExecutions = computed(() => {
  if (!proposal.value || !strategiesWithTreasuries.value) return [];

  const executions = [] as (StrategyWithTreasury & {
    transactions: Transaction[];
  })[];

  for (const strategy of strategiesWithTreasuries.value) {
    const transactions = proposal.value.executions[strategy.address] ?? [];

    executions.push({
      ...strategy,
      transactions
    });
  }

  return executions;
});
const hasExecution = computed(() =>
  editorExecutions.value.some(strategy => strategy.transactions.length > 0)
);
const extraContacts = computed(() => {
  return props.space.treasuries as Contact[];
});
const guidelines = computed(() => {
  if (!props.space.guidelines) return null;

  return sanitizeUrl(props.space.guidelines);
});

const bodyDefinition = computed(() => ({
  type: 'string',
  format: 'long',
  title: 'Body',
  maxLength: limits.value[`space.${spaceType.value}.body_limit`],
  examples: ['Propose something…']
}));

const choicesPlaceholders = computed<string[]>(() => {
  if (proposal.value?.type === 'basic') {
    return BASIC_CHOICES;
  }

  const placeholders: string[] = [];
  for (
    let i = 1;
    i <= limits.value[`space.${spaceType.value}.choices_limit`];
    i++
  ) {
    placeholders.push(`Choice ${i}`);
  }

  return placeholders;
});

const choicesMinItems = computed<number>(() => {
  if (!offchainNetworks.includes(props.space.network)) {
    return BASIC_CHOICES.length;
  }

  return proposal.value?.type === 'basic' ? 2 : 1;
});

const choicesDefinition = computed(() => ({
  type: 'array',
  minItems: choicesMinItems.value,
  maxItems:
    proposal.value?.type === 'basic'
      ? BASIC_CHOICES.length
      : limits.value[`space.${spaceType.value}.choices_limit`],
  items: {
    type: 'string',
    title: 'Choice',
    examples: choicesPlaceholders.value,
    minLength: 1,
    maxLength: 32
  },
  sortable: proposal.value?.type !== 'basic'
}));

const formErrors = computed(() => {
  if (!proposal.value) return {};

  return validateForm(
    {
      type: 'object',
      title: 'Proposal',
      additionalProperties: false,
      required: ['title', 'choices'],
      properties: {
        title: TITLE_DEFINITION,
        body: bodyDefinition.value,
        discussion: DISCUSSION_DEFINITION,
        choices: choicesDefinition.value
      }
    },
    {
      title: proposal.value.title,
      body: proposal.value.body,
      discussion: proposal.value.discussion,
      choices: proposal.value.choices
    },
    {
      skipEmptyOptionalFields: true
    }
  );
});
const isSubmitButtonLoading = computed(() => {
  if (web3.value.authLoading) return true;
  if (!web3.value.account) return false;

  return (
    sending.value ||
    (!propositionPower.value && !isPropositionPowerError.value) ||
    isPropositionPowerPending.value
  );
});
const canSubmit = computed(() => {
  const hasUnsupportedNetworks =
    alerts.value.has('HAS_PRO_ONLY_NETWORKS') &&
    !proposal.value?.originalProposal;
  const hasFormErrors = Object.keys(formErrors.value).length > 0;

  if (
    alerts.value.has('IS_HIBERNATED') ||
    hasUnsupportedNetworks ||
    hasFormErrors ||
    disabledStrategiesList.value.length ||
    unsupportedPremiumStrategiesList.value.length ||
    isSafeInvalidNetwork.value
  ) {
    return false;
  }

  return web3.value.account
    ? propositionPower.value?.canPropose
    : !web3.value.authLoading;
});
const spaceType = computed(() => {
  if (props.space.turbo) return 'turbo';
  if (props.space.verified) return 'verified';
  return 'default';
});

const spaceTypeForProposalLimit = computed(() => {
  if (lists.value['space.ecosystem.list'].includes(props.space.id))
    return 'ecosystem';
  if (props.space.additionalRawData?.flagged) return 'flagged';
  return spaceType.value;
});

const proposalLimitReached = computed(() => {
  const type = spaceTypeForProposalLimit.value;

  return (
    (props.space.proposal_count_1d || 0) >=
      limits.value[`space.${type}.proposal_limit_per_day`] ||
    (props.space.proposal_count_30d || 0) >=
      limits.value[`space.${type}.proposal_limit_per_month`]
  );
});

const unixTimestamp = computed(() => Math.floor(timestamp.value / 1000));

const defaultVotingDelay = computed(() =>
  isOffchainSpace.value ? DEFAULT_VOTING_DELAY : 0
);

const proposalStart = computed(
  () => proposal.value?.start ?? unixTimestamp.value + props.space.voting_delay
);

const proposalMinEnd = computed(
  () =>
    proposal.value?.min_end ??
    proposalStart.value +
      (props.space.min_voting_period || defaultVotingDelay.value)
);

const proposalMaxEnd = computed(() => {
  if (isOffchainSpace.value) return proposalMinEnd.value;

  return (
    proposal.value?.max_end ??
    proposalStart.value +
      (props.space.max_voting_period || defaultVotingDelay.value)
  );
});

const {
  data: propositionPower,
  isPending: isPropositionPowerPending,
  isError: isPropositionPowerError,
  refetch: fetchPropositionPower
} = usePropositionPowerQuery(toRef(props, 'space'));

async function handleProposeClick() {
  if (!proposal.value) return;

  if (props.space.terms && !termsStore.areAccepted(props.space)) {
    modalOpenTerms.value = true;
    return;
  }

  if (!web3.value.account) {
    modalAccountOpen.value = true;
    return;
  }

  sending.value = true;

  try {
    const choices = proposal.value.choices.filter(choice => !!choice);
    const executions = editorExecutions.value
      .filter(
        strategy =>
          strategy.treasury.chainId && strategy.transactions.length > 0
      )
      .map(strategy => ({
        strategyType: strategy.type,
        strategyAddress: strategy.address,
        destinationAddress: strategy.destinationAddress || '',
        transactions: strategy.transactions,
        treasuryName: strategy.treasury.name,
        chainId: Number(strategy.treasury.chainId)
      }));

    let result;
    if (proposal.value.originalProposal) {
      result = await updateProposal(
        props.space,
        proposal.value.originalProposal,
        proposal.value.title,
        proposal.value.body,
        proposal.value.discussion,
        proposal.value.type,
        choices,
        proposal.value.privacy,
        proposal.value.labels,
        executions
      );

      if (result) {
        uiStore.addNotification('success', 'Proposal updated successfully.');
      }
    } else {
      const appName = (route.query.app as LocationQueryValue) || '';

      // Proposal start, min and end time are unix timestamp,
      // and are not compatible with onchain EMV spaces (those use blocks instead of timestamps)
      // (these args are ignored by onchain networks)
      result = await propose(
        props.space,
        proposal.value.title,
        proposal.value.body,
        proposal.value.discussion,
        proposal.value.type,
        choices,
        proposal.value.privacy,
        proposal.value.labels,
        appName.length <= 128 ? appName : '',
        unixTimestamp.value,
        proposalStart.value,
        proposalMinEnd.value,
        proposalMaxEnd.value,
        executions
      );

      if (result) {
        uiStore.addNotification('success', 'Proposal created successfully.');
      }
    }
    if (result) {
      queryClient.invalidateQueries({
        queryKey: PROPOSALS_KEYS.space(props.space.network, props.space.id)
      });
    }

    if (
      proposal.value.originalProposal &&
      offchainNetworks.includes(props.space.network)
    ) {
      router.push({
        name: 'space-proposal-overview',
        params: {
          proposal: proposal.value.originalProposal.proposal_id
        }
      });
    } else {
      router.push({ name: 'space-proposals' });
    }
  } catch (e) {
    console.error(e);
  } finally {
    sending.value = false;
  }
}

function handleAcceptTerms() {
  termsStore.accept(props.space);
  handleProposeClick();
}

function handleExecutionUpdated(
  strategyAddress: string,
  transactions: Transaction[]
) {
  if (!proposal.value) return;

  proposal.value.executions[strategyAddress] = transactions;
}

function handleTransactionAccept() {
  if (
    !walletConnectSpaceKey.value ||
    !walletConnectTransactionExecutionStrategy.value ||
    !transaction.value ||
    !proposal.value
  )
    return;

  const transactions =
    proposal.value.executions[
      walletConnectTransactionExecutionStrategy.value.address
    ] ?? [];

  proposal.value.executions[
    walletConnectTransactionExecutionStrategy.value.address
  ] = [...transactions, transaction.value];

  reset();
}

watch(
  [() => web3.value.account, () => web3.value.authLoading],
  ([account, authLoading]) => {
    if (!account || authLoading) return;
  },
  { immediate: true }
);

watch(
  draftId,
  async id => {
    if (id) return true;

    const newId = await createDraft(spaceKey.value);

    router.replace({
      name: 'space-editor',
      params: { key: newId },
      query: route.query
    });
  },
  { immediate: true }
);

watch(proposalData, () => {
  if (!proposal.value) return;

  proposal.value.updatedAt = Date.now();
});

watch(
  () => props.space,
  async () => {
    await refreshDrafts();
  }
);

watchEffect(() => {
  const title = proposal.value?.originalProposal
    ? 'Update proposal'
    : 'New proposal';

  setTitle(`${title} - ${props.space.name}`);
});
</script>
<template>
  <div v-if="proposal" class="h-full">
    <UiTopnav
      :class="{ 'maximum:border-l': isWhiteLabel }"
      class="maximum:border-r"
    >
      <div class="flex items-center gap-3 shrink truncate">
        <UiButton
          :to="{ name: 'space-overview', params: { space: spaceKey } }"
          class="ml-4 shrink-0"
          uniform
        >
          <IH-arrow-narrow-left />
        </UiButton>
        <h4
          class="grow truncate"
          v-text="
            proposal?.originalProposal ? 'Update proposal' : 'New proposal'
          "
        />
      </div>
      <div class="flex gap-2 items-center">
        <IndicatorPendingTransactions />
        <UiTooltip title="Drafts">
          <UiButton uniform @click="modalOpen = true">
            <IH-collection />
          </UiButton>
        </UiTooltip>
        <UiButton
          class="min-w-[46px] !px-0 md:!px-3"
          primary
          :loading="isSubmitButtonLoading"
          :disabled="!canSubmit"
          @click="handleProposeClick"
        >
          <span
            class="hidden md:inline-block"
            v-text="proposal?.originalProposal ? 'Update' : 'Publish'"
          />
          <IH-paper-airplane class="rotate-90 relative left-[2px]" />
        </UiButton>
      </div>
    </UiTopnav>
    <div
      class="flex items-stretch md:flex-row flex-col w-full md:h-full pt-header-height"
    >
      <div
        class="flex-1 grow min-w-0 border-r-0 md:border-r max-md:pb-0"
        v-bind="$attrs"
      >
        <UiContainer class="pt-5 !max-w-[730px] mx-0 md:mx-auto s-box">
          <UiAlert v-if="alerts.has('IS_HIBERNATED')" type="error" class="mb-4">
            This space is hibernated and read-only. A space admin needs to
            reactivate it to create new proposals.
          </UiAlert>
          <UiAlert
            v-else-if="nonPremiumNetworksList && !proposal?.originalProposal"
            type="error"
            class="mb-4"
          >
            You cannot create proposals. This space is configured with
            non-premium networks (<span v-html="nonPremiumNetworksList" />).
            Change to a
            <AppLink
              to="https://help.snapshot.box/en/articles/10478752-what-are-the-premium-networks"
              class="font-semibold text-rose-500"
            >
              premium network
            </AppLink>
            or
            <AppLink
              :to="{ name: 'space-pro' }"
              class="font-semibold text-rose-500"
            >
              upgrade your space
            </AppLink>
            to continue.
          </UiAlert>
          <UiAlert
            v-else-if="
              disabledStrategiesList.length && !proposal?.originalProposal
            "
            type="error"
            class="mb-4"
          >
            You can not create proposals. The
            <span v-html="prettyConcat(disabledStrategiesList)" />
            {{
              disabledStrategiesList.length > 1
                ? 'strategies are'
                : 'strategy is'
            }}
            no longer available.
            <AppLink
              to="https://help.snapshot.box/en/articles/11638664-migrating-from-multichain-voting-strategy"
              class="font-semibold text-rose-500"
            >
              See migration guide
            </AppLink>
            <template v-if="isController || isAdmin">
              and
              <AppLink
                :to="{
                  name: 'space-settings',
                  params: { tab: 'voting-strategies' }
                }"
                class="font-semibold text-rose-500"
                >update your space</AppLink
              >.
            </template>
          </UiAlert>
          <UiAlert
            v-else-if="
              unsupportedPremiumStrategiesList.length &&
              !proposal?.originalProposal
            "
            type="error"
            class="mb-4"
          >
            This space is configured with premium strategies, please
            <AppLink
              :to="{ name: 'space-pro' }"
              class="font-semibold text-rose-500"
            >
              upgrade to Snapshot Pro
            </AppLink>
            or
            <AppLink
              :to="{
                name: 'space-settings',
                params: { tab: 'voting-strategies' }
              }"
              class="font-semibold text-rose-500"
              >edit your strategies</AppLink
            >
            to create a proposal.
            <AppLink
              to="https://help.snapshot.box/en/articles/12038725-premium-voting-strategies"
              class="font-semibold text-rose-500"
            >
              Learn more </AppLink
            >.
          </UiAlert>
          <UiAlert
            v-else-if="space.snapshot_chain_id && isSafeInvalidNetwork"
            type="error"
            class="mb-4"
          >
            Please use a Safe on
            {{ networks[space.snapshot_chain_id]?.name ?? 'this network' }} to
            create proposals.
          </UiAlert>
          <template v-else>
            <template v-if="proposalLimitReached">
              <UiAlert type="error" class="mb-4">
                <span
                  v-if="
                    ['default', 'flagged'].includes(spaceTypeForProposalLimit)
                  "
                >
                  Please verify your space to publish more proposals.
                  <AppLink
                    :to="VERIFIED_URL"
                    class="text-rose-500 dark:text-neutral-100 font-semibold"
                  >
                    Verify space </AppLink
                  >.</span
                >
                <span v-else-if="spaceTypeForProposalLimit !== 'turbo'">
                  You can publish up to
                  {{ limits['space.verified.proposal_limit_per_day'] }}
                  proposals per day and
                  {{ limits['space.verified.proposal_limit_per_month'] }}
                  proposals per month.
                  <AppLink
                    :to="{ name: 'space-pro' }"
                    class="text-rose-500 dark:text-neutral-100 font-semibold"
                    >Increase limit</AppLink
                  >.
                </span>
              </UiAlert>
            </template>
            <template v-else-if="!isPropositionPowerPending">
              <MessageErrorFetchPower
                v-if="isPropositionPowerError || !propositionPower"
                class="mb-4"
                :type="'proposition'"
                @fetch="fetchPropositionPower"
              />
              <MessagePropositionPower
                v-else-if="propositionPower && !propositionPower.canPropose"
                class="mb-4"
                :proposition-power="propositionPower"
              />
            </template>
          </template>
          <div v-if="guidelines">
            <UiEyebrow class="mb-2">Guidelines</UiEyebrow>
            <AppLink :to="guidelines" class="block mb-4">
              <UiLinkPreview :url="guidelines" :show-default="true" />
            </AppLink>
          </div>
          <UiInputString
            :key="proposalKey || ''"
            v-model="proposal.title"
            :definition="TITLE_DEFINITION"
            :error="formErrors.title"
            :required="true"
          />
          <div class="flex space-x-3">
            <button type="button" @click="previewEnabled = false">
              <UiLabel
                :is-active="!previewEnabled"
                text="Write"
                class="border-transparent"
              />
            </button>
            <button type="button" @click="previewEnabled = true">
              <UiLabel
                :is-active="previewEnabled"
                text="Preview"
                class="border-transparent"
              />
            </button>
          </div>
          <UiMarkdown
            v-if="previewEnabled"
            class="px-3 py-2 border rounded-lg mb-[14px] min-h-[260px]"
            :body="proposal.body"
          />
          <UiComposer
            v-else
            v-model="proposal.body"
            :definition="bodyDefinition"
            :error="formErrors.body"
          >
            <template
              v-if="
                !space?.turbo &&
                isOffchainSpace &&
                formErrors.body?.startsWith('Must not have more than')
              "
              #error-suffix
            >
              <AppLink
                :to="{ name: 'space-pro' }"
                class="ml-1 text-skin-danger font-semibold"
                >Increase limit</AppLink
              >.
            </template>
          </UiComposer>
          <UiInputString
            :key="proposalKey || ''"
            v-model="proposal.discussion"
            :definition="DISCUSSION_DEFINITION"
            :error="formErrors.discussion"
          />
          <UiLinkPreview :key="proposalKey || ''" :url="proposal.discussion" />
          <div
            v-if="
              network &&
              strategiesWithTreasuries &&
              strategiesWithTreasuries.length > 0
            "
          >
            <UiEyebrow class="mb-2 mt-4">Execution</UiEyebrow>
            <EditorExecution
              v-for="execution in editorExecutions"
              :key="execution.address"
              :model-value="execution.transactions"
              :disabled="
                !supportsMultipleTreasuries &&
                hasExecution &&
                execution.transactions.length === 0
              "
              :space="space"
              :strategy="execution"
              :extra-contacts="extraContacts"
              class="mb-3"
              @update:model-value="
                value => handleExecutionUpdated(execution.address, value)
              "
            />
          </div>
        </UiContainer>
      </div>

      <Affix
        :class="['shrink-0 md:w-[340px]']"
        :top="TOTAL_NAV_HEIGHT"
        :bottom="64"
      >
        <div v-bind="$attrs" class="flex flex-col px-4 gap-y-4 pt-4 !h-auto">
          <EditorVotingType
            v-model="proposal"
            :voting-types="
              enforcedVoteType ? [enforcedVoteType] : space.voting_types
            "
          />
          <div class="space-y-2.5">
            <UiEyebrow>Choices</UiEyebrow>
            <UiInputArray
              v-model="proposal.choices"
              class="s-box"
              :definition="choicesDefinition"
              :error="formErrors.choices"
            >
              <template
                v-if="proposal.type === 'basic'"
                #input-prefix="{ index }"
              >
                <UiIconBasicChoice :choice-index="index" />
              </template>
              <template
                v-if="proposal.type === 'basic'"
                #input-suffix="{ index, deleteItem }"
              >
                <button
                  v-if="index > 1"
                  class="text-skin-text"
                  title="Delete choice"
                  @click="deleteItem(index)"
                >
                  <IH-trash />
                </button>
                <div v-else />
              </template>
              <template
                v-if="
                  proposal.type !== 'basic' &&
                  proposal.choices.length >= choicesDefinition.maxItems
                "
                #suffix
              >
                <div class="text-skin-danger">
                  Maximum number of choices reached.
                  <AppLink
                    :to="{ name: 'space-pro' }"
                    class="text-skin-danger font-semibold"
                    >Increase limit</AppLink
                  >.
                </div>
              </template>
            </UiInputArray>
          </div>
          <UiSwitch
            v-if="isOffchainSpace && space.privacy === 'any'"
            v-model="privacy"
            title="Shielded voting"
            tooltip="Choices will be encrypted and only visible once the voting period is over."
          />
          <EditorLabels
            v-if="space.labels?.length"
            v-model="proposal.labels"
            :space="space"
          />
          <EditorTimeline
            v-model="proposal"
            :space="space"
            :created="proposal.created || unixTimestamp"
            :start="proposalStart"
            :min_end="proposalMinEnd"
            :max_end="proposalMaxEnd"
            :editable="!proposal.originalProposal"
          />
        </div>
      </Affix>
    </div>
    <teleport to="#modal">
      <ModalTerms
        v-if="space.terms"
        :open="modalOpenTerms"
        :space="space"
        @close="modalOpenTerms = false"
        @accept="handleAcceptTerms"
      />
      <ModalDrafts
        :open="modalOpen"
        :network-id="space.network"
        :space="space.id"
        @close="modalOpen = false"
      />
      <ModalTransaction
        v-if="transaction && walletConnectNetwork"
        :open="!!transaction"
        :network="walletConnectNetwork"
        :initial-state="transaction._form"
        @add="handleTransactionAccept"
        @close="reset"
      />
    </teleport>
  </div>
</template>
