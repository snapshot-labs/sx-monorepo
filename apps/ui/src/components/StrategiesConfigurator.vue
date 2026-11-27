<script setup lang="ts">
import { ORACLE_STRATEGIES, SNAPSHOT_ORACLE } from '@/helpers/constants';
import { validateForm } from '@/helpers/validation';
import { getNetwork, metadataNetwork } from '@/networks';
import { StrategyConfig, StrategyTemplate } from '@/networks/types';
import { NetworkID } from '@/types';

const ORACLE_DEFINITION = {
  type: 'object',
  additionalProperties: false,
  required: ['address', 'url'],
  properties: {
    address: {
      type: 'string',
      format: 'ethAddress',
      title: 'Oracle'
    },
    url: {
      type: 'string',
      format: 'uri',
      title: 'Oracle URL',
      examples: [SNAPSHOT_ORACLE.url]
    }
  }
};

const model = defineModel<StrategyConfig[]>({ required: true });

const props = withDefaults(
  defineProps<{
    networkId: NetworkID;
    spaceId: string;
    votingPowerSymbol: string;
    limit?: number;
    unique?: boolean;
    availableStrategies: StrategyTemplate[];
    defaultParams?: Record<string, any>;
    showTestButton?: boolean;
  }>(),
  {
    limit: Infinity,
    unique: false,
    defaultParams: () => ({})
  }
);

const editedStrategy: Ref<StrategyConfig | null> = ref(null);
const testedStrategies: Ref<StrategyConfig[]> = ref([]);
const editStrategyModalOpen = ref(false);
const isTestStrategiesModalOpen = ref(false);
const oracleTemplate: Ref<StrategyTemplate | null> = ref(null);
const isSnapshotStrategiesModalOpen = ref(false);
const oracleForm = ref({ ...SNAPSHOT_ORACLE });
const isOracleEditing = ref(false);

const limitReached = computed(() => model.value.length >= props.limit);
const activeStrategiesMap = computed(() =>
  Object.fromEntries(model.value.map(strategy => [strategy.name, strategy]))
);

// Oracle strategy params are a Snapshot strategy, picked and edited like offchain strategies
const isOracle = (strategy: StrategyTemplate) => strategy.type === 'Oracle';

const oracleErrors = computed(() =>
  validateForm(ORACLE_DEFINITION, oracleForm.value)
);

const editModalProps = computed(() => {
  const strategy = editedStrategy.value;
  if (!strategy) return null;

  if (isOracle(strategy)) {
    return {
      networkId: metadataNetwork,
      strategyAddress: strategy.params.id,
      initialState: strategy.params.params,
      customErrorValidation: () =>
        Object.keys(oracleErrors.value).length
          ? 'Invalid oracle settings.'
          : undefined
    };
  }

  return {
    networkId: props.networkId,
    strategyAddress: strategy.address,
    definition: strategy.paramsDefinition,
    initialState: strategy.params
  };
});

function addSnapshotStrategy(snapshotStrategy: StrategyTemplate) {
  if (!oracleTemplate.value) return;

  editStrategy({
    id: crypto.randomUUID(),
    ...oracleTemplate.value,
    params: {
      id: snapshotStrategy.address,
      network: String(getNetwork(props.networkId).chainId),
      params: snapshotStrategy.defaultParams || {},
      oracle: SNAPSHOT_ORACLE.address,
      url: SNAPSHOT_ORACLE.url
    }
  });
}

function addStrategy(strategy: StrategyTemplate) {
  if (limitReached.value) return;

  if (isOracle(strategy)) {
    oracleTemplate.value = strategy;
    isSnapshotStrategiesModalOpen.value = true;
    return;
  }

  const strategyConfig = {
    id: crypto.randomUUID(),
    params: {
      ...props.defaultParams
    },
    ...strategy
  };

  if (strategy.paramsDefinition) {
    editStrategy(strategyConfig);
  } else {
    model.value = [...model.value, strategyConfig];
  }
}

function editStrategy(strategy: StrategyConfig) {
  if (isOracle(strategy)) {
    oracleForm.value = {
      address: strategy.params.oracle,
      url: strategy.params.url
    };
    isOracleEditing.value = false;
  }

  editedStrategy.value = strategy;
  editStrategyModalOpen.value = true;
}

function removeStrategy(strategy: StrategyConfig) {
  model.value = model.value.filter(s => s.id !== strategy.id);
}

function handleStrategySave(value: Record<string, any>) {
  editStrategyModalOpen.value = false;

  const edited = editedStrategy.value;
  if (!edited) return;

  const params = isOracle(edited)
    ? {
        // The id and network stay: the oracle only signs for the space network
        ...edited.params,
        // The scale of the raw values: the strategy params' decimals, or the strategy's own
        decimals: Number(value.decimals ?? ORACLE_STRATEGIES[edited.params.id]),
        params: value,
        oracle: oracleForm.value.address,
        url: oracleForm.value.url
      }
    : value;

  let allStrategies = [...model.value];
  if (!allStrategies.find(s => s.id === edited.id)) {
    allStrategies.push(edited);
  }

  model.value = allStrategies.map(strategy => {
    if (strategy.id !== edited.id) return strategy;

    return {
      ...strategy,
      params
    };
  });
}

async function handleTestStrategies(strategies: StrategyConfig[]) {
  testedStrategies.value = strategies;
  isTestStrategiesModalOpen.value = true;
}
</script>

<template>
  <div>
    <div class="mb-2 flex items-center justify-between">
      <UiEyebrow class="font-medium">Active</UiEyebrow>
      <UiTooltip
        v-if="model.length && showTestButton"
        title="Test all custom strategies"
        class="flex items-center"
      >
        <button class="text-skin-link" @click="handleTestStrategies(model)">
          <IH-play />
        </button>
      </UiTooltip>
    </div>
    <div class="space-y-3 mb-4">
      <div v-if="model.length === 0">No strategies selected</div>
      <FormStrategiesStrategyActive
        v-for="strategy in model"
        :key="strategy.id"
        :network-id="networkId"
        :strategy="strategy"
        :show-test-button="showTestButton"
        @edit-strategy="editStrategy"
        @delete-strategy="removeStrategy"
        @test-strategies="handleTestStrategies"
      />
    </div>
    <UiEyebrow class="mb-2 font-medium">Available</UiEyebrow>
    <div v-if="availableStrategies.length === 0">No strategies available</div>
    <div v-else class="space-y-3">
      <ButtonStrategy
        v-for="strategy in availableStrategies.filter(s => !s.deprecated)"
        :key="strategy.address"
        :disabled="
          limitReached || (unique && !!activeStrategiesMap[strategy.name])
        "
        :strategy="strategy"
        @click="addStrategy(strategy)"
      />
    </div>
    <teleport to="#modal">
      <ModalTestStrategy
        :open="isTestStrategiesModalOpen"
        :network-id="networkId"
        :space-id="spaceId"
        :voting-power-symbol="votingPowerSymbol"
        :strategies="testedStrategies"
        @close="isTestStrategiesModalOpen = false"
      />
      <ModalStrategies
        :open="isSnapshotStrategiesModalOpen"
        :network-id="metadataNetwork"
        :allowed-strategies="Object.keys(ORACLE_STRATEGIES)"
        @add-strategy="addSnapshotStrategy"
        @close="isSnapshotStrategiesModalOpen = false"
      />
      <ModalEditStrategy
        v-if="editModalProps"
        v-bind="editModalProps"
        :open="editStrategyModalOpen"
        @close="editStrategyModalOpen = false"
        @save="handleStrategySave"
      >
        <div v-if="editedStrategy && isOracle(editedStrategy)" class="mt-4">
          <UiEyebrow class="mb-2 font-medium">Oracle</UiEyebrow>
          <UiForm
            v-if="isOracleEditing"
            v-model="oracleForm"
            :error="oracleErrors"
            :definition="ORACLE_DEFINITION"
          />
          <div
            v-else
            class="flex items-center gap-3 rounded-lg border px-4 py-3"
          >
            <UiStamp
              :id="oracleForm.address"
              type="avatar"
              :size="32"
              class="!rounded-md"
            />
            <div class="flex-1 min-w-0 leading-[22px]">
              <UiAddress :address="oracleForm.address" class="text-skin-link" />
              <div class="truncate">{{ oracleForm.url }}</div>
            </div>
            <UiTooltip title="Edit oracle">
              <UiButton uniform @click="isOracleEditing = true">
                <IH-pencil />
              </UiButton>
            </UiTooltip>
          </div>
        </div>
      </ModalEditStrategy>
    </teleport>
  </div>
</template>
