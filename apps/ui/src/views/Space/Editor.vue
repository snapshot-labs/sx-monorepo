<script setup lang="ts">
import { sanitizeUrl } from '@braintree/sanitize-url';
import { useQueryClient } from '@tanstack/vue-query';
import { LocationQueryValue } from 'vue-router';
import { StrategyWithTreasury } from '@/composables/useTreasuries';
import { VERIFIED_URL } from '@/helpers/constants';
import { _n, omit } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import { getNetwork, offchainNetworks } from '@/networks';
import { PROPOSALS_KEYS } from '@/queries/proposals';
import { usePropositionPowerQuery } from '@/queries/propositionPower';
import { Contact, Space, Transaction, VoteType } from '@/types';

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
const { proposals, createDraft } = useEditor();
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
const {
  networks,
  premiumChainIds,
  loaded: networksLoaded
} = useOffchainNetworksList(props.space.network);
const { limits, lists } = useSettings();
const { isWhiteLabel } = useWhiteLabel();

const modalOpen = ref(false);
const modalOpenTerms = ref(false);
const { modalAccountOpen } = useModal();
const previewEnabled = ref(false);
const sending = ref(false);
const enforcedVoteType = ref<VoteType | null>(null);

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

const choicesDefinition = computed(() => ({
  type: 'array',
  title: 'Choices',
  minItems: offchainNetworks.includes(props.space.network) ? 1 : 3,
  maxItems: limits.value[`space.${spaceType.value}.choices_limit`],
  items: [{ type: 'string', minLength: 1, maxLength: 32 }],
  additionalItems: { type: 'string', maxLength: 32 }
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
      choices: proposal.value.choices.filter(choice => !!choice)
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
    !props.space.turbo &&
    !proposal.value?.proposalId &&
    unsupportedProposalNetworks.value.length;
  const hasFormErrors = Object.keys(formErrors.value).length > 0;

  if (hasUnsupportedNetworks || hasFormErrors) {
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

const unsupportedProposalNetworks = computed(() => {
  if (!props.space.snapshot_chain_id || !networksLoaded.value) return [];

  const ids = new Set<number>([
    props.space.snapshot_chain_id,
    ...props.space.strategies_params.map(strategy => Number(strategy.network)),
    ...props.space.strategies_params.flatMap(strategy =>
      Array.isArray(strategy.params?.strategies)
        ? strategy.params.strategies.map(param => Number(param.network))
        : []
    )
  ]);

  return Array.from(ids)
    .filter(n => !premiumChainIds.value.has(n))
    .map(chainId => networks.value.find(n => n.chainId === chainId))
    .filter(network => !!network);
});

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
        chainId: strategy.treasury.chainId as number
      }));

    let result;
    if (proposal.value.proposalId) {
      result = await updateProposal(
        props.space,
        proposal.value.proposalId,
        proposal.value.title,
        proposal.value.body,
        proposal.value.discussion,
        proposal.value.type,
        choices,
        proposal.value.privacy,
        proposal.value.labels,
        executions
      );
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
    }
    if (result) {
      queryClient.invalidateQueries({
        queryKey: PROPOSALS_KEYS.space(props.space.network, props.space.id)
      });
    }

    if (
      proposal.value.proposalId &&
      offchainNetworks.includes(props.space.network)
    ) {
      router.push({
        name: 'space-proposal-overview',
        params: {
          proposal: proposal.value.proposalId
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

watchEffect(() => {
  if (!proposal.value) return;

  const hasOSnap = editorExecutions.value.find(
    strategy => strategy.type === 'oSnap' && strategy.transactions.length > 0
  );

  if (hasOSnap) {
    enforcedVoteType.value = 'basic';
    proposal.value.type = 'basic';
  } else {
    enforcedVoteType.value = null;
  }
});

watchEffect(() => {
  const title = proposal.value?.proposalId ? 'Update proposal' : 'New proposal';

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
          class="w-[46px] !px-0 ml-4 shrink-0"
        >
          <IH-arrow-narrow-left />
        </UiButton>
        <h4
          class="grow truncate"
          v-text="proposal?.proposalId ? 'Update proposal' : 'New proposal'"
        />
      </div>
      <div class="flex gap-2 items-center">
        <IndicatorPendingTransactions />
        <UiTooltip title="Drafts">
          <UiButton class="leading-3 !px-0 w-[46px]" @click="modalOpen = true">
            <IH-collection class="inline-block" />
          </UiButton>
        </UiTooltip>
        <UiButton
          class="primary min-w-[46px] flex gap-2 justify-center items-center !px-0 md:!px-3"
          :loading="isSubmitButtonLoading"
          :disabled="!canSubmit"
          @click="handleProposeClick"
        >
          <span
            class="hidden md:inline-block"
            v-text="proposal?.proposalId ? 'Update' : 'Publish'"
          />
          <IH-paper-airplane class="rotate-90 relative left-[2px]" />
        </UiButton>
      </div>
    </UiTopnav>
    <div
      class="flex items-stretch md:flex-row flex-col w-full md:h-full mt-[72px]"
    >
      <div
        class="flex-1 grow min-w-0 border-r-0 md:border-r max-md:pb-0"
        v-bind="$attrs"
      >
        <UiContainer class="pt-5 !max-w-[710px] mx-0 md:mx-auto s-box">
          <UiAlert
            v-if="
              !space.turbo &&
              unsupportedProposalNetworks.length &&
              !proposal?.proposalId
            "
            type="error"
            class="mb-4"
          >
            You cannot create proposals. This space is configured with
            non-premium networks (<template
              v-for="(n, i) in unsupportedProposalNetworks"
              :key="n.key"
            >
              <b>{{ n.name }}</b>
              <template
                v-if="
                  unsupportedProposalNetworks.length > 1 &&
                  i < unsupportedProposalNetworks.length - 1
                "
                >,
              </template> </template
            >). Change to a
            <AppLink
              to="https://help.snapshot.box/en/articles/10478752-what-are-the-premium-networks"
              class="font-semibold text-rose-500"
            >
              premium network
              <IH-arrow-sm-right class="inline-block -rotate-45" />
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
          <template v-else>
            <template v-if="proposalLimitReached">
              <UiAlert type="error" class="mb-4">
                <span
                  v-if="
                    ['default', 'flagged'].includes(spaceTypeForProposalLimit)
                  "
                >
                  Please verify your space to publish more proposals.
                  <a
                    :href="VERIFIED_URL"
                    target="_blank"
                    class="text-rose-500 dark:text-neutral-100 font-semibold"
                  >
                    Verify space </a
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
            <h4 class="mb-2 eyebrow">Guidelines</h4>
            <a :href="guidelines" target="_blank" class="block mb-4">
              <UiLinkPreview :url="guidelines" :show-default="true" />
            </a>
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
              <UiLink
                :is-active="!previewEnabled"
                text="Write"
                class="border-transparent"
              />
            </button>
            <button type="button" @click="previewEnabled = true">
              <UiLink
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
            <h4 class="eyebrow mb-2 mt-4">Execution</h4>
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

      <Affix :class="['shrink-0 md:w-[340px]']" :top="72" :bottom="64">
        <div v-bind="$attrs" class="flex flex-col px-4 gap-y-4 pt-4 !h-auto">
          <EditorVotingType
            v-model="proposal"
            :voting-types="
              enforcedVoteType ? [enforcedVoteType] : space.voting_types
            "
          />
          <EditorChoices
            v-model="proposal"
            :minimum-basic-choices="
              offchainNetworks.includes(space.network) ? 2 : 3
            "
            :definition="choicesDefinition"
            :error="
              proposal.choices.length > choicesDefinition.maxItems
                ? `Must not have more than ${_n(choicesDefinition.maxItems)} items.`
                : ''
            "
          >
            <template v-if="!space?.turbo && isOffchainSpace" #error-suffix>
              <AppLink
                :to="{ name: 'space-pro' }"
                class="ml-1 text-skin-danger font-semibold"
                >Increase limit</AppLink
              >.
            </template>
          </EditorChoices>
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
            :editable="!proposal.proposalId"
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
