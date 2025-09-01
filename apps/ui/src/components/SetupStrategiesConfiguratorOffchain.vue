<script lang="ts">
const availableStrategies = ref<StrategyTemplate[]>([]);
const editStrategyModalStrategyId = ref<StrategyTemplate['address']>();
</script>

<script setup lang="ts">
import { getNetwork } from '@/networks';
import { StrategyConfig, StrategyTemplate } from '@/networks/types';
import { ChainId, NetworkID } from '@/types';

const POPULAR_STRATEGIES: Record<string, StrategyTemplate['address']> = {
  'ERC-20': 'erc20-balance-of',
  'ERC-20 Votes': 'erc20-votes',
  'ERC-721': 'erc721',
  'ERC-1155': 'erc1155-balance-of'
} as const;

const HIDDEN_STRATEGIES: StrategyTemplate['address'][] = ['ticket'];

const strategies = defineModel<StrategyConfig[]>({ required: true });

const props = defineProps<{
  snapshotChainId: number;
  networkId: NetworkID;
  spaceId: string;
  votingPowerSymbol: string;
}>();

const { limits } = useSettings();

const chainId = ref<number>(props.snapshotChainId);
const isLoading = ref(false);
const hasError = ref(false);
const isEditStrategyModalOpen = ref(false);
const isTestStrategiesModalOpen = ref(false);
const testedStrategies: Ref<StrategyConfig[]> = ref([]);

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

function handlePopularStrategyClick(id: string) {
  editStrategyModalStrategyId.value = POPULAR_STRATEGIES[id];
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

function handleTestStrategies(strategies: StrategyConfig[]) {
  testedStrategies.value = strategies;
  isTestStrategiesModalOpen.value = true;
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
        :hidden-strategies="HIDDEN_STRATEGIES"
        :limit="limits['space.default.strategies_limit']"
        @test-strategies="handleTestStrategies"
      >
        <template v-if="strategies.length" #actions>
          <UiTooltip title="Test all custom strategies">
            <UiButton
              class="!p-0 !border-0 !h-auto !w-[20px]"
              @click="handleTestStrategies(strategies)"
            >
              <IH-play />
            </UiButton>
          </UiTooltip>
        </template>
        <template #empty>
          <div class="space-y-3">
            <div>Here are some of the most common voting strategies:</div>
            <div class="flex flex-wrap gap-2">
              <UiButton
                v-for="(name, id) in POPULAR_STRATEGIES"
                :key="id"
                class="border py-2 px-3 text-center rounded-lg"
                @click="handlePopularStrategyClick(id)"
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
      <ModalTestStrategy
        :open="isTestStrategiesModalOpen"
        :network-id="networkId"
        :chain-id="snapshotChainId"
        :space-id="spaceId"
        :voting-power-symbol="votingPowerSymbol"
        :strategies="testedStrategies"
        @close="isTestStrategiesModalOpen = false"
      />
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
