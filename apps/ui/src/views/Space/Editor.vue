<script setup lang="ts">
import { StrategyWithTreasury } from '@/composables/useTreasuries';
import {
  MAX_1D_PROPOSALS,
  MAX_30D_PROPOSALS,
  MAX_BODY_LENGTH,
  MAX_CHOICES,
  TURBO_URL,
  VERIFIED_URL
} from '@/helpers/turbo';
import { _n, omit } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import { getNetwork, offchainNetworks } from '@/networks';
import { Contact, Space, Transaction, VoteType } from '@/types';

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

const { setTitle } = useTitle();
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
const proposalsStore = useProposalsStore();
const { votingPower, fetch: fetchVotingPower } = useVotingPower();
const { strategiesWithTreasuries } = useTreasuries(props.space);

const modalOpen = ref(false);
const previewEnabled = ref(false);
const sending = ref(false);
const enforcedVoteType = ref<VoteType | null>(null);

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

const bodyDefinition = computed(() => ({
  type: 'string',
  format: 'long',
  title: 'Body',
  maxLength: MAX_BODY_LENGTH[props.space.turbo ? 'turbo' : 'default'],
  examples: ['Propose something…']
}));

const choicesDefinition = computed(() => ({
  type: 'array',
  title: 'Choices',
  minItems: 1,
  maxItems: MAX_CHOICES[props.space.turbo ? 'turbo' : 'default'],
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
      choices: proposal.value.choices
    },
    {
      skipEmptyOptionalFields: true
    }
  );
});
const canSubmit = computed(() => {
  if (Object.keys(formErrors.value).length > 0) return false;

  return web3.value.account
    ? votingPower.value?.canPropose
    : !web3.value.authLoading;
});
const spaceType = computed(() =>
  props.space.turbo ? 'turbo' : props.space.verified ? 'verified' : 'default'
);

const proposalLimitReached = computed(
  () =>
    (props.space.proposal_count_1d || 0) >= MAX_1D_PROPOSALS[spaceType.value] ||
    (props.space.proposal_count_30d || 0) >= MAX_30D_PROPOSALS[spaceType.value]
);

async function handleProposeClick() {
  if (!proposal.value) return;

  sending.value = true;

  try {
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
        proposal.value.choices,
        proposal.value.labels,
        executions
      );
    } else {
      result = await propose(
        props.space,
        proposal.value.title,
        proposal.value.body,
        proposal.value.discussion,
        proposal.value.type,
        proposal.value.choices,
        proposal.value.labels,
        executions
      );
    }
    if (result) {
      proposalsStore.reset(props.space.id, props.space.network);
      router.push({
        name: 'space-proposals'
      });
    }
  } finally {
    sending.value = false;
  }
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

function handleFetchVotingPower() {
  fetchVotingPower(props.space);
}

watch(
  () => web3.value.account,
  toAccount => {
    if (!toAccount) return;

    handleFetchVotingPower();
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
      params: { key: newId }
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
  <div v-if="proposal">
    <UiTopnav class="gap-2 px-4">
      <UiButton
        :to="{ name: 'space-overview', params: { space: spaceKey } }"
        class="w-[46px] !px-0 mr-2 shrink-0"
      >
        <IH-arrow-narrow-left />
      </UiButton>
      <h4
        class="grow truncate"
        v-text="proposal?.proposalId ? 'Update proposal' : 'New proposal'"
      />
      <IndicatorPendingTransactions />
      <UiTooltip title="Drafts">
        <UiButton class="leading-3 !px-0 w-[46px]" @click="modalOpen = true">
          <IH-collection class="inline-block" />
        </UiButton>
      </UiTooltip>
      <UiButton
        class="primary min-w-[46px] flex gap-2 justify-center items-center !px-0 md:!px-3"
        :loading="
          !!web3.account &&
          (sending || !votingPower || votingPower.status === 'loading')
        "
        :disabled="!canSubmit"
        @click="handleProposeClick"
      >
        <span
          class="hidden md:inline-block"
          v-text="proposal?.proposalId ? 'Update' : 'Publish'"
        />
        <IH-paper-airplane class="rotate-90 relative left-[2px]" />
      </UiButton>
    </UiTopnav>
    <div class="md:mr-[340px]">
      <UiContainer class="pt-5 !max-w-[710px] mx-0 md:mx-auto s-box">
        <MessageVotingPower
          v-if="votingPower"
          class="mb-4"
          :voting-power="votingPower"
          action="propose"
          @fetch-voting-power="handleFetchVotingPower"
        />
        <UiAlert
          v-if="votingPower && spaceType === 'default' && proposalLimitReached"
          type="error"
          class="mb-4"
        >
          <span
            >Please verify your space to publish more proposals.
            <a
              :href="VERIFIED_URL"
              target="_blank"
              class="text-rose-500 dark:text-neutral-100 font-semibold"
              >Verify space</a
            >.</span
          >
        </UiAlert>
        <UiAlert
          v-else-if="
            votingPower && spaceType !== 'turbo' && proposalLimitReached
          "
          type="error"
          class="mb-4"
        >
          <span
            >You can publish up to {{ MAX_1D_PROPOSALS.verified }} proposals per
            day and {{ MAX_30D_PROPOSALS.verified }} proposals per month.
            <a
              :href="TURBO_URL"
              target="_blank"
              class="text-rose-500 dark:text-neutral-100 font-semibold"
              >Increase limit</a
            >.</span
          >
        </UiAlert>
        <UiInputString
          :key="proposalKey || ''"
          v-model="proposal.title"
          :definition="TITLE_DEFINITION"
          :error="formErrors.title"
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
            <a
              :href="TURBO_URL"
              target="_blank"
              class="ml-1 text-skin-danger font-semibold"
              >Increase limit</a
            >.
          </template>
        </UiComposer>
        <div class="s-base mb-5">
          <UiInputString
            :key="proposalKey || ''"
            v-model="proposal.discussion"
            :definition="DISCUSSION_DEFINITION"
            :error="formErrors.discussion"
          />
          <UiLinkPreview :key="proposalKey || ''" :url="proposal.discussion" />
        </div>
        <div
          v-if="
            network &&
            strategiesWithTreasuries &&
            strategiesWithTreasuries.length > 0
          "
        >
          <h4 class="eyebrow mb-2">Execution</h4>
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

    <div
      class="static md:fixed md:top-[72px] md:right-0 w-full md:h-[calc(100vh-72px)] md:max-w-[340px] p-4 md:pb-[88px] border-l-0 md:border-l space-y-4 no-scrollbar overflow-y-scroll"
    >
      <EditorVotingType
        v-model="proposal"
        :voting-types="
          enforcedVoteType ? [enforcedVoteType] : space.voting_types
        "
      />
      <EditorChoices
        v-model="proposal"
        :definition="choicesDefinition"
        :error="
          proposal.choices.length > choicesDefinition.maxItems
            ? `Must not have more than ${_n(choicesDefinition.maxItems)} items.`
            : ''
        "
      >
        <template v-if="!space?.turbo && isOffchainSpace" #error-suffix>
          <a
            :href="TURBO_URL"
            target="_blank"
            class="ml-1 text-skin-danger font-semibold"
            >Increase limit</a
          >.
        </template>
      </EditorChoices>
      <ProposalLabels
        v-if="space.labels?.length"
        v-model="proposal.labels"
        :space-labels="space.labels"
        show-edit
      />
      <div>
        <h4 class="eyebrow mb-2.5" v-text="'Timeline'" />
        <ProposalTimeline :data="space" />
      </div>
    </div>
    <teleport to="#modal">
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
