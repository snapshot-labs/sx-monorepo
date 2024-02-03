<script setup lang="ts">
import { getNetwork, supportsNullCurrent } from '@/networks';
import { omit, shortenAddress } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import { SelectedStrategy } from '@/types';

const TITLE_DEFINITION = {
  type: 'string',
  title: 'Title',
  minLength: 1
};

const DISCUSSION_DEFINITION = {
  type: 'string',
  format: 'uri',
  title: 'Discussion',
  examples: ['e.g. https://forum.balancer.fi/t/proposal…']
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
  reset
} = useWalletConnectTransaction();
const { getCurrent } = useMetaStore();
const spacesStore = useSpacesStore();

const modalOpen = ref(false);
const previewEnabled = ref(false);
const sending = ref(false);
const fetchingVotingPower = ref(true);
const votingPowerValid = ref(false);

const network = computed(() => (networkId.value ? getNetwork(networkId.value) : null));
const space = computed(() => {
  if (!resolved.value) return null;

  return spacesStore.spacesMap.get(`${networkId.value}:${address.value}`);
});
const proposalKey = computed(() => {
  if (!resolved.value) return null;

  const key = route.params.key as string;
  return `${networkId.value}:${address.value}:${key}`;
});
const proposal = computed(() => {
  if (!proposalKey.value) return null;

  if (!proposals[proposalKey.value]) {
    createDraft(`${networkId.value}:${address.value}`, undefined, route.params.key as string);
  }

  return proposals[proposalKey.value];
});
const proposalData = computed(() => {
  if (!proposal.value) return null;

  return JSON.stringify(omit(proposal.value, ['updatedAt']));
});
const executionStrategy = computed({
  get() {
    if (!proposal.value) return null;

    return proposal.value.executionStrategy;
  },
  set(value: SelectedStrategy | null) {
    if (!proposal.value) return;

    proposal.value.executionStrategy = value;
  }
});
const supportedExecutionStrategies = computed(() => {
  const spaceValue = space.value;
  const networkValue = network.value;
  if (!spaceValue || !networkValue) return null;

  return spaceValue.executors.filter(
    (_, i) => networkValue.constants.SUPPORTED_EXECUTORS[spaceValue.executors_types[i]]
  );
});
const formErrors = computed(() => {
  if (!proposal.value) return {};

  return validateForm(
    {
      type: 'object',
      title: 'Proposal',
      additionalProperties: false,
      required: ['title'],
      properties: {
        title: TITLE_DEFINITION,
        discussion: DISCUSSION_DEFINITION
      }
    },
    {
      title: proposal.value.title,
      discussion: proposal.value.discussion
    },
    {
      skipEmptyOptionalFields: true
    }
  );
});
const canSubmit = computed(() => {
  return (
    !fetchingVotingPower.value &&
    votingPowerValid.value &&
    Object.keys(formErrors.value).length === 0
  );
});

async function handleProposeClick() {
  if (!space.value || !proposal.value) return;

  sending.value = true;

  try {
    let result;
    if (proposal.value.proposalId) {
      result = await updateProposal(
        space.value,
        proposal.value.proposalId,
        proposal.value.title,
        proposal.value.body,
        proposal.value.discussion,
        proposal.value.executionStrategy?.address ?? null,
        proposal.value.executionStrategy?.address ? proposal.value.execution : []
      );
    } else {
      result = await propose(
        space.value,
        proposal.value.title,
        proposal.value.body,
        proposal.value.discussion,
        proposal.value.executionStrategy?.address ?? null,
        proposal.value.executionStrategy?.address ? proposal.value.execution : []
      );
    }
    if (result) router.back();
  } finally {
    sending.value = false;
  }
}

async function handleExecutionStrategySelected(selectedExecutionStrategy: SelectedStrategy) {
  if (executionStrategy.value?.address === selectedExecutionStrategy.address) {
    executionStrategy.value = null;
  } else {
    executionStrategy.value = selectedExecutionStrategy;
  }
}

function handleTransactionAccept() {
  if (!spaceKey.value || !executionStrategy.value || !transaction.value || !proposal.value) return;

  proposal.value.execution.push(transaction.value);

  reset();
}

async function getVotingPower() {
  if (!space.value || !web3.value.account) return;

  fetchingVotingPower.value = true;
  try {
    const network = getNetwork(space.value.network);

    const votingPowers = await network.actions.getVotingPower(
      space.value.voting_power_validation_strategy_strategies,
      space.value.voting_power_validation_strategy_strategies_params,
      space.value.voting_power_validation_strategies_parsed_metadata,
      web3.value.account,
      supportsNullCurrent(space.value.network) ? null : getCurrent(space.value.network) || 0
    );

    const currentVotingPower = votingPowers.reduce((a, b) => a + b.value, 0n);
    votingPowerValid.value = currentVotingPower >= BigInt(space.value.proposal_threshold);
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
import { NavigationGuard } from 'vue-router';
import { resolver } from '@/helpers/resolver';

const { createDraft } = useEditor();

const handleRouteChange: NavigationGuard = async to => {
  if (to.params.key) {
    return true;
  }

  const resolved = await resolver.resolveName(to.params.id as string);
  if (!resolved) return false;

  const draftId = createDraft(`${resolved.networkId}:${resolved.address}`);

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
  <div>
    <nav class="border-b bg-skin-bg fixed top-0 z-50 right-0 left-0 lg:left-[72px]">
      <div class="flex items-center h-[71px] mx-4">
        <div class="flex-auto space-x-2">
          <router-link :to="{ name: 'space-overview', params: { id: param } }" class="mr-2">
            <UiButton class="leading-3 w-[46px] !px-0">
              <IH-arrow-narrow-left class="inline-block" />
            </UiButton>
          </router-link>
          <h4 class="py-2 inline-block">New proposal</h4>
        </div>
        <PendingTransactionsIndicator class="mr-2" />
        <UiLoading v-if="!space" class="block p-4" />
        <div v-else class="space-x-2">
          <UiButton
            class="float-left leading-3 !pl-3 !pr-[12px] rounded-r-none"
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
    <Container v-if="proposal" class="pt-5 !max-w-[660px] mx-0 md:mx-auto s-box">
      <UiAlert v-if="!fetchingVotingPower && !votingPowerValid" type="error" class="mb-4">
        You do not have enough voting power to create proposal in this space.
      </UiAlert>
      <SIString
        :key="proposalKey || ''"
        v-model="proposal.title"
        :definition="TITLE_DEFINITION"
        :error="formErrors.title"
      />
      <div class="flex space-x-3">
        <Link
          :is-active="!previewEnabled"
          text="Write"
          class="border-transparent"
          @click="previewEnabled = false"
        />
        <Link
          :is-active="previewEnabled"
          text="Preview"
          class="border-transparent"
          @click="previewEnabled = true"
        />
      </div>
      <Markdown
        v-if="previewEnabled"
        class="px-3 py-2 border rounded-lg mb-5 min-h-[200px]"
        :body="proposal.body"
      />
      <MarkdownEditor v-else v-model="proposal.body" class="" />
      <div class="s-base mb-4">
        <SIString
          :key="proposalKey || ''"
          v-model="proposal.discussion"
          :definition="DISCUSSION_DEFINITION"
          :error="formErrors.discussion"
        />
        <Preview :key="proposalKey || ''" :url="proposal.discussion" />
      </div>
      <div
        v-if="
          space &&
          network &&
          supportedExecutionStrategies &&
          supportedExecutionStrategies.length > 0
        "
      >
        <h4 class="eyebrow mb-2">Execution</h4>
        <div class="border rounded-lg mb-3">
          <ExecutionButton
            v-for="(executor, i) in supportedExecutionStrategies"
            :key="executor"
            class="flex-auto flex items-center gap-2"
            @click="
              handleExecutionStrategySelected({
                address: executor,
                type: space.executors_types[i]
              })
            "
          >
            <IH-chip />
            <span class="flex-1">
              {{ network.constants.EXECUTORS[space.executors_types[i]] }}
              execution strategy
              <span class="hidden sm:inline-block">({{ shortenAddress(executor) }})</span>
            </span>
            <IH-check v-if="executionStrategy?.address === executor" />
          </ExecutionButton>
        </div>
        <BlockExecutionEditable
          v-if="executionStrategy"
          v-model="proposal.execution"
          :selected-execution-strategy="executionStrategy"
          :space="space"
          class="mb-4"
        />
      </div>
    </Container>
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
