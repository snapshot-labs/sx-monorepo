<script setup lang="ts">
import { NavigationGuard } from 'vue-router';
import { StrategyWithTreasury } from '@/composables/useTreasuries';
import { resolver } from '@/helpers/resolver';
import { omit } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import { getNetwork, offchainNetworks, supportsNullCurrent } from '@/networks';
import { Contact, Transaction, VoteType } from '@/types';

const MAX_BODY_LENGTH = {
  default: 10000,
  turbo: 40000
} as const;

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

const CHOICES_DEFINITION = {
  type: 'array',
  title: 'Choices',
  minItems: 1,
  maxItems: 500,
  items: [{ type: 'string', minLength: 1, maxLength: 32 }],
  additionalItems: { type: 'string', maxLength: 32 }
};

const { setTitle } = useTitle();
const { proposals, createDraft } = useEditor();
const { param } = useRouteParser('id');
const { resolved, address, networkId } = useResolve(param);
const route = useRoute();
const router = useRouter();
const { propose, updateProposal } = useActions();
const { web3 } = useWeb3();
const {
  spaceKey,
  network: walletConnectNetwork,
  transaction,
  executionStrategy: walletConnectTransactionExecutionStrategy,
  reset
} = useWalletConnectTransaction();
const { getCurrent } = useMetaStore();
const spacesStore = useSpacesStore();
const proposalsStore = useProposalsStore();

const modalOpen = ref(false);
const previewEnabled = ref(false);
const sending = ref(false);
const fetchingVotingPower = ref(true);
const votingPowerValid = ref(false);

const network = computed(() =>
  networkId.value ? getNetwork(networkId.value) : null
);
const space = computed(() => {
  if (!resolved.value) return null;

  return (
    spacesStore.spacesMap.get(`${networkId.value}:${address.value}`) ?? null
  );
});
const { strategiesWithTreasuries } = useTreasuries(space);
const proposalKey = computed(() => {
  if (!resolved.value) return null;

  const key = route.params.key as string;
  return `${networkId.value}:${address.value}:${key}`;
});
const proposal = computedAsync(async () => {
  if (!proposalKey.value || !networkId.value) return null;

  if (!proposals[proposalKey.value]) {
    await createDraft(
      `${networkId.value}:${address.value}`,
      undefined,
      route.params.key as string
    );
  }

  return proposals[proposalKey.value];
});
const proposalData = computed(() => {
  if (!proposal.value) return null;

  return JSON.stringify(omit(proposal.value, ['updatedAt']));
});
const enforcedVoteType = ref<VoteType | null>(null);
const supportsMultipleTreasuries = computed(() => {
  if (!space.value) return false;

  return offchainNetworks.includes(space.value.network);
});

const editorExecutions = computed(() => {
  if (!proposal.value || !strategiesWithTreasuries.value) return [];

  const executions = [] as (StrategyWithTreasury & {
    transactions: Transaction[];
  })[];

  for (const execution in proposal.value.executions) {
    const strategy = strategiesWithTreasuries.value.find(
      strategy => strategy.address === execution
    );

    if (!strategy) continue;

    executions.push({
      ...strategy,
      transactions: proposal.value.executions[execution] ?? []
    });
  }

  return executions;
});
const extraContacts = computed(() => {
  if (!space.value) return [];

  return space.value.treasuries as Contact[];
});
const bodyDefinition = computed(() => ({
  type: 'string',
  format: 'long',
  title: 'Body',
  maxLength: MAX_BODY_LENGTH[space.value?.turbo ? 'turbo' : 'default']
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
        choices: CHOICES_DEFINITION
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
    ? !fetchingVotingPower.value && votingPowerValid.value
    : !web3.value.authLoading;
});

async function handleProposeClick() {
  if (!space.value || !proposal.value) return;

  sending.value = true;

  try {
    const executions = editorExecutions.value
      .filter(strategy => strategy.treasury.chainId)
      .map(strategy => ({
        strategyAddress: strategy.address,
        destinationAddress: strategy.destinationAddress || '',
        transactions: proposal.value?.executions[strategy.address] ?? [],
        treasuryName: strategy.treasury.name,
        chainId: strategy.treasury.chainId as number
      }));

    let result;
    if (proposal.value.proposalId) {
      result = await updateProposal(
        space.value,
        proposal.value.proposalId,
        proposal.value.title,
        proposal.value.body,
        proposal.value.discussion,
        proposal.value.type,
        proposal.value.choices,
        executions
      );
    } else {
      result = await propose(
        space.value,
        proposal.value.title,
        proposal.value.body,
        proposal.value.discussion,
        proposal.value.type,
        proposal.value.choices,
        executions
      );
    }
    if (result) {
      proposalsStore.reset(address.value!, networkId.value!);
      router.push({
        name: 'space-proposals',
        params: { id: param.value }
      });
    }
  } finally {
    sending.value = false;
  }
}

async function handleExecutionStrategySelected(
  selectedExecutionStrategy: StrategyWithTreasury
) {
  if (!proposal.value || !strategiesWithTreasuries.value) return;

  const alreadySelected =
    proposal.value.executions[selectedExecutionStrategy.address];

  if (alreadySelected) {
    delete proposal.value.executions[selectedExecutionStrategy.address];
  } else {
    if (!supportsMultipleTreasuries.value) {
      proposal.value.executions = {};
    }

    proposal.value.executions[selectedExecutionStrategy.address] = [];
  }

  const hasOSnap = strategiesWithTreasuries.value.some(
    strategy =>
      strategy.type === 'oSnap' && proposal.value?.executions[strategy.address]
  );

  if (hasOSnap && proposal.value) {
    enforcedVoteType.value = 'basic';
    proposal.value.type = 'basic';
  } else {
    enforcedVoteType.value = null;
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
    !spaceKey.value ||
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

async function getVotingPower() {
  if (!space.value || !web3.value.account) return;

  fetchingVotingPower.value = true;
  try {
    const network = getNetwork(space.value.network);

    const votingPowers = await network.actions.getVotingPower(
      space.value.id,
      space.value.voting_power_validation_strategy_strategies,
      space.value.voting_power_validation_strategy_strategies_params,
      space.value.voting_power_validation_strategies_parsed_metadata,
      web3.value.account,
      {
        at: supportsNullCurrent(space.value.network)
          ? null
          : getCurrent(space.value.network) || 0,
        chainId: space.value.snapshot_chain_id
      }
    );

    const currentVotingPower = votingPowers.reduce((a, b) => a + b.value, 0n);
    votingPowerValid.value =
      currentVotingPower >= BigInt(space.value.proposal_threshold);
  } catch (e) {
    console.warn('Failed to load voting power', e);
  } finally {
    fetchingVotingPower.value = false;
  }
}

watch(
  [networkId, address],
  ([networkId, address]) => {
    if (!networkId || !address) return;

    spacesStore.fetchSpace(address, networkId);
  },
  { immediate: true }
);
watch([space, () => web3.value.account], () => getVotingPower());
watch(proposalData, () => {
  if (!proposal.value) return;

  proposal.value.updatedAt = Date.now();
});

watchEffect(() => {
  if (!space.value) return;

  const title = proposal.value?.proposalId ? 'Update proposal' : 'New proposal';

  setTitle(`${title} - ${space.value.name}`);
});
</script>
<script lang="ts">
const { createDraft } = useEditor();
const handleRouteChange: NavigationGuard = async to => {
  if (to.params.key) {
    return true;
  }

  const resolved = await resolver.resolveName(to.params.id as string);
  if (!resolved) return false;

  const draftId = await createDraft(
    `${resolved.networkId}:${resolved.address}`
  );

  return {
    ...to,
    params: {
      ...to.params,
      key: draftId
    }
  };
};

export default defineComponent({
  beforeRouteEnter: handleRouteChange,
  beforeRouteUpdate: handleRouteChange
});
</script>

<template>
  <div v-if="proposal">
    <nav class="border-b bg-skin-bg fixed top-0 z-50 inset-x-0 lg:left-[72px]">
      <div class="flex items-center h-[71px] mx-4">
        <div class="flex-auto space-x-2">
          <router-link
            :to="{ name: 'space-overview', params: { id: param } }"
            class="mr-2"
            tabindex="-1"
          >
            <UiButton class="leading-3 w-[46px] !px-0">
              <IH-arrow-narrow-left class="inline-block" />
            </UiButton>
          </router-link>
          <h4 class="py-2 inline-block">New proposal</h4>
        </div>
        <IndicatorPendingTransactions class="mr-2" />
        <UiLoading v-if="!space" class="block p-4" />
        <div v-else class="space-x-2">
          <UiButton
            class="float-left leading-3 !pl-3 !pr-2.5 rounded-r-none"
            @click="modalOpen = true"
          >
            <IH-collection class="inline-block" />
          </UiButton>
          <UiButton
            class="rounded-l-none border-l-0 float-left !m-0 !px-3"
            :loading="sending || (web3.account !== '' && fetchingVotingPower)"
            :disabled="!canSubmit"
            @click="handleProposeClick"
          >
            <span
              class="hidden mr-2 md:inline-block"
              v-text="proposal?.proposalId ? 'Update' : 'Publish'"
            />
            <IH-paper-airplane class="inline-block rotate-90" />
          </UiButton>
        </div>
      </div>
    </nav>
    <div class="md:mr-[340px]">
      <UiContainer class="pt-5 !max-w-[660px] mx-0 md:mx-auto s-box">
        <UiAlert
          v-if="!fetchingVotingPower && !votingPowerValid"
          type="error"
          class="mb-4"
        >
          You do not have enough voting power to create proposal in this space.
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
          class="px-3 py-2 border rounded-lg mb-[14px] min-h-[200px]"
          :body="proposal.body"
        />
        <UiComposer
          v-else
          v-model="proposal.body"
          :definition="bodyDefinition"
          :error="formErrors.body"
        />
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
            space &&
            network &&
            strategiesWithTreasuries &&
            strategiesWithTreasuries.length > 0
          "
        >
          <h4 class="eyebrow mb-2">Execution</h4>
          <div class="border rounded-lg mb-3">
            <ExecutionButton
              v-for="strategy in strategiesWithTreasuries"
              :key="strategy.address"
              class="flex-auto flex items-center gap-2"
              @click="handleExecutionStrategySelected(strategy)"
            >
              <IH-chip />
              <span class="flex-1">
                {{ strategy.treasury.name }}
                <span class="hidden sm:inline-block">
                  ({{
                    strategy.type === 'oSnap'
                      ? 'oSnap'
                      : `${network.constants.EXECUTORS[strategy.type]} execution strategy`
                  }})
                </span>
              </span>
              <IH-check v-if="proposal.executions[strategy.address]" />
            </ExecutionButton>
          </div>
          <EditorExecution
            v-for="execution in editorExecutions"
            :key="execution.address"
            :model-value="execution.transactions"
            :space="space"
            :treasury-data="execution.treasury"
            :extra-contacts="extraContacts"
            class="mb-4"
            @update:model-value="
              value => handleExecutionUpdated(execution.address, value)
            "
          />
        </div>
      </UiContainer>
    </div>

    <div
      v-if="space"
      class="static md:fixed md:top-[72px] md:right-0 w-full md:h-[calc(100vh-72px)] md:max-w-[340px] p-4 md:pb-[88px] border-l-0 md:border-l space-y-4 no-scrollbar overflow-y-scroll"
    >
      <EditorVotingType
        v-model="proposal"
        :voting-types="
          enforcedVoteType ? [enforcedVoteType] : space.voting_types
        "
      />
      <EditorChoices v-model="proposal" :definition="CHOICES_DEFINITION" />
    </div>
    <teleport to="#modal">
      <ModalDrafts
        v-if="networkId && address"
        :open="modalOpen"
        :network-id="networkId"
        :space="address"
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
