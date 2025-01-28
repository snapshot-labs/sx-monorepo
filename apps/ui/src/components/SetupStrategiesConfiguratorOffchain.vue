<script lang="ts">
type TokenStandard = 'ERC-20' | 'ERC-721' | 'ERC-1155';

const availableStrategies = ref<StrategyTemplate[]>([]);
const editStrategyModalStrategyId = ref<StrategyTemplate['address']>();
</script>

<script setup lang="ts">
import { getNetwork } from '@/networks';
import { StrategyConfig, StrategyTemplate } from '@/networks/types';
import { ChainId, NetworkID } from '@/types';

const TOKEN_STANDARD_STRATEGY_MAPPING: Record<
  TokenStandard,
  StrategyTemplate['address']
> = {
  'ERC-20': 'erc20-balance-of',
  'ERC-721': 'erc721',
  'ERC-1155': 'erc1155-balance-of'
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

function handleSelectTokenStandard(tokenStandard: TokenStandard) {
  editStrategyModalStrategyId.value =
    TOKEN_STANDARD_STRATEGY_MAPPING[tokenStandard];
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

  strategies.value = [strategy];
  isEditStrategyModalOpen.value = false;
}

function reset() {
  strategies.value = [];
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
    <div class="space-y-4">
      <UiStrategiesConfiguratorOffchain
        v-model:model-value="strategies"
        :network-id="networkId"
        :default-chain-id="chainId"
        :limit="8"
      >
        <template #empty>
          <div class="space-y-3">
            <div>Setup your voting power weighted by an ERC token</div>
            <div class="flex gap-2">
              <UiButton
                v-for="(standard, id) in TOKEN_STANDARD_STRATEGY_MAPPING"
                :key="id"
                @click="handleSelectTokenStandard(id)"
              >
                {{ id }}
              </UiButton>
            </div>
            <div>Or choose from our growing list of strategies</div>
          </div>
        </template>
      </UiStrategiesConfiguratorOffchain>
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
    </teleport>
  </div>
</template>
