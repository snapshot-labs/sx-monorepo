<script lang="ts">
type VotingSetupId = 'ticket' | 'whitelist' | 'token-weighted' | 'custom';
type VotingSetup = {
  label: string;
  description: string;
  strategyId?: StrategyTemplate['address'];
  icon?: Component;
};

const availableStrategies = ref<StrategyTemplate[]>([]);
const editStrategyModalStrategyId = ref<StrategyTemplate['address']>();
const votingSetupId = ref<VotingSetupId>();
const selectedTokenStandard = ref<TokenStandard>();
</script>

<script setup lang="ts">
import UiSelector from '@/components/Ui/Selector.vue';
import { getNetwork } from '@/networks';
import { StrategyConfig, StrategyTemplate } from '@/networks/types';
import { ChainId, NetworkID } from '@/types';
import { TokenStandard } from './Modal/SelectTokenStandard.vue';
import IHBeaker from '~icons/heroicons-outline/beaker';

const VOTING_SETUPS: Record<VotingSetupId, VotingSetup> = {
  ticket: {
    label: 'Anyone can vote',
    strategyId: 'ticket',
    icon: IHBeaker,
    description:
      'A strategy that gives one voting power to anyone. It should only be used for testing purposes and not in production.'
  },
  whitelist: {
    label: 'Whitelist',
    strategyId: 'whitelist',
    description:
      'A strategy that gives voting power to a predefined list of addresses.'
  },
  'token-weighted': {
    label: 'Token weighted',
    description:
      'Votes are weighted by a token. The token can be an ERC-20, ERC-721 or ERC-1155 token standard.'
  },
  custom: {
    label: 'Custom setup',
    description:
      "Select up to 8 strategies with a wide range of options. If you can't find the right strategy for your use case, you can create your own"
  }
} as const;

const TOKEN_STANDARD_STRATEGY_MAPPING: Record<
  TokenStandard,
  StrategyTemplate['address']
> = {
  ERC20: 'erc20-balance-of',
  ERC721: 'erc721',
  ERC1155: 'erc1155-balance-of'
} as const;

const strategies = defineModel<StrategyConfig[]>({ required: true });

const props = defineProps<{
  snapshotChainId: number;
  networkId: NetworkID;
  space: { turbo: boolean; verified: boolean };
}>();

const chainId = ref<number>(props.snapshotChainId);
const isLoading = ref(false);
const hasError = ref(false);
const isEditStrategyModalOpen = ref(false);
const isSelectTokenStandardModelOpen = ref(false);
const expectedVotingSetupId = ref<VotingSetupId>();
const expectedTokenStandard = ref<TokenStandard>();

const editStrategyModalStrategy: ComputedRef<StrategyConfig | undefined> =
  computed(() => {
    if (editStrategyModalStrategyId.value === strategies.value[0]?.address) {
      return strategies.value[0];
    }

    const strategyTemplate = availableStrategies.value.find(
      strategy => strategy.address === editStrategyModalStrategyId.value
    );

    if (!strategyTemplate) return;

    return {
      id: crypto.randomUUID(),
      params: strategyTemplate.defaultParams || {},
      ...strategyTemplate
    };
  });

async function loadAvailableStrategies() {
  if (availableStrategies.value.length) return;

  isLoading.value = true;

  try {
    const network = getNetwork(props.networkId);
    availableStrategies.value = await network.api.loadStrategies();
    hasError.value = false;
  } catch (e) {
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
}

function handleVotingSetupClick(id: string) {
  if (id === 'custom') {
    strategies.value = [];
    votingSetupId.value = 'custom';
    return;
  }

  expectedVotingSetupId.value = id as VotingSetupId;

  if (id === 'token-weighted') {
    isSelectTokenStandardModelOpen.value = true;
    return;
  }

  editStrategyModalStrategyId.value = VOTING_SETUPS[id].strategyId;
  isEditStrategyModalOpen.value = true;
}

function handleSelectTokenStandard(tokenStandard: TokenStandard) {
  expectedTokenStandard.value = tokenStandard;
  editStrategyModalStrategyId.value =
    TOKEN_STANDARD_STRATEGY_MAPPING[tokenStandard];
  isSelectTokenStandardModelOpen.value = false;
  isEditStrategyModalOpen.value = true;
}

function handleSaveStrategy(value: StrategyConfig['params'], chainId: ChainId) {
  if (!editStrategyModalStrategy.value || !editStrategyModalStrategyId.value)
    return;

  const strategy: StrategyConfig = {
    ...editStrategyModalStrategy.value,
    params: value,
    chainId
  };

  selectedTokenStandard.value = Object.values(
    TOKEN_STANDARD_STRATEGY_MAPPING
  ).includes(editStrategyModalStrategyId.value)
    ? expectedTokenStandard.value
    : undefined;

  votingSetupId.value = expectedVotingSetupId.value;
  strategies.value = [strategy];
  isEditStrategyModalOpen.value = false;
}

function reset() {
  strategies.value = [];
  votingSetupId.value = undefined;
  selectedTokenStandard.value = undefined;
}

onMounted(() => {
  loadAvailableStrategies();

  if (!strategies.value.length) {
    reset();
  }
});
</script>

<template>
  <div>
    <UiAlert v-if="hasError" type="error">
      <div>
        An error happened while fetching the strategies list. Please try again
      </div>
      <UiButton
        class="flex items-center justify-center gap-2"
        :loading="isLoading"
        @click="loadAvailableStrategies"
      >
        <IH-refresh />
        Retry
      </UiButton>
    </UiAlert>
    <UiLoading v-else-if="isLoading" class="block" />
    <div v-else-if="votingSetupId !== 'custom'" class="space-y-3">
      <UiSelectorCard
        :is="UiSelector"
        v-for="(type, id) in VOTING_SETUPS"
        :key="id"
        :item="{ ...type, key: id }"
        :selected="votingSetupId === id"
        :is-active="votingSetupId === id"
        @click="handleVotingSetupClick"
      />
    </div>
    <div v-else class="space-y-4">
      <div>
        <h4 class="eyebrow mb-2">Selected</h4>
        <div
          class="rounded-lg border px-4 py-3 text-skin-link leading-[18px] flex justify-between items-center gap-3"
        >
          <div
            class="whitespace-nowrap"
            v-text="VOTING_SETUPS[votingSetupId].label"
          />
          <button type="button" @click="reset">
            <IH-trash />
          </button>
        </div>
      </div>
      <FormSpaceStrategies
        v-model:snapshot-chain-id="chainId"
        v-model:strategies="strategies"
        :network-id="networkId"
        :is-ticket-valid="true"
        :with-network-selector="false"
        :space="space"
      />
    </div>
    <teleport to="#modal">
      <ModalEditStrategy
        v-if="editStrategyModalStrategy"
        with-network-selector
        :open="isEditStrategyModalOpen"
        :network-id="networkId"
        :initial-network="editStrategyModalStrategy.chainId ?? snapshotChainId"
        :strategy-address="editStrategyModalStrategy.address"
        :definition="editStrategyModalStrategy.paramsDefinition"
        :initial-state="editStrategyModalStrategy.params"
        @save="handleSaveStrategy"
        @close="isEditStrategyModalOpen = false"
      />
      <ModalSelectTokenStandard
        :open="isSelectTokenStandardModelOpen"
        :initial-state="selectedTokenStandard"
        @close="isSelectTokenStandardModelOpen = false"
        @save="handleSelectTokenStandard"
      />
    </teleport>
  </div>
</template>
