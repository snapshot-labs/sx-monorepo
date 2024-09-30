<script setup lang="ts">
import objectHash from 'object-hash';
import { MAX_STRATEGIES } from '@/helpers/turbo';
import { StrategyConfig, StrategyTemplate } from '@/networks/types';
import { NetworkID, Space } from '@/types';

const snapshotChainId = defineModel<string>('snapshotChainId', {
  required: true
});
const strategies = defineModel<StrategyConfig[]>('strategies', {
  required: true
});

const props = defineProps<{
  networkId: NetworkID;
  space: Space;
}>();

const emit = defineEmits<{
  (e: 'updateValidity', valid: boolean): void;
}>();

const isStrategiesModalOpen = ref(false);
const isEditStrategyModalOpen = ref(false);
const editedStrategy: Ref<StrategyConfig | null> = ref(null);

const strategiesLimit = computed(() => {
  const spaceType = props.space.turbo
    ? 'turbo'
    : props.space.verified
      ? 'verified'
      : 'default';

  return MAX_STRATEGIES[spaceType];
});

const isTicketValid = computed(() => {
  return !(
    strategies.value.some(s => s.address === 'ticket') &&
    props.space.additionalRawData?.voteValidation.name === 'any'
  );
});

function handleAddStrategy(strategy: StrategyTemplate) {
  editedStrategy.value = {
    id: crypto.randomUUID(),
    params: strategy.defaultParams || {},
    ...strategy
  };

  isEditStrategyModalOpen.value = true;
}

async function handleEditStrategy(strategy: StrategyConfig) {
  editedStrategy.value = strategy;
  isEditStrategyModalOpen.value = true;
}

function handleSaveStrategy(params: Record<string, any>, network: string) {
  const editedStrategyValue = editedStrategy.value;

  if (editedStrategyValue === null) return;

  isEditStrategyModalOpen.value = false;

  let allStrategies = [...strategies.value];
  if (!allStrategies.find(s => s.id === editedStrategyValue.id)) {
    allStrategies.push(editedStrategyValue);
  }

  strategies.value = allStrategies.map(strategy => {
    if (strategy.id !== editedStrategyValue.id) return strategy;

    return {
      ...strategy,
      chainId: network,
      params
    };
  });
}

function validateStrategy(params: Record<string, any>, network: string) {
  const editedStrategyValue = editedStrategy.value;
  if (editedStrategyValue === null) return;

  const otherStrategies = strategies.value.filter(
    s => s.id !== editedStrategyValue.id
  );

  const hasDuplicates = otherStrategies.some(
    s =>
      s.address === editedStrategyValue.address &&
      s.chainId === network &&
      objectHash(s.params) === objectHash(params)
  );

  if (hasDuplicates) return 'Two identical strategies are not allowed.';
}

function handleRemoveStrategy(strategy: StrategyConfig) {
  strategies.value = strategies.value.filter(s => s.id !== strategy.id);
}

watchEffect(() => {
  emit('updateValidity', isTicketValid.value);
});
</script>

<template>
  <h4 class="eyebrow mb-2 font-medium">Strategies</h4>
  <div class="s-box mb-4">
    <UiSelectorNetwork
      v-model="snapshotChainId"
      :network-id="networkId"
      tooltip="The default network used for this space. Networks can also be specified in individual strategies"
    />
  </div>
  <UiContainerSettings
    :title="`Select up to ${strategiesLimit} strategies`"
    description="(Voting power is cumulative)"
  >
    <div class="space-y-3 mb-3">
      <div v-if="strategies.length === 0">No strategies selected</div>
      <UiMessage
        v-else-if="!isTicketValid"
        type="danger"
        learn-more-link="https://snapshot.mirror.xyz/-uSylOUP82hGAyWUlVn4lCg9ESzKX9QCvsUgvv-ng84"
      >
        In order to use the "ticket" strategy you are required to set a voting
        validation strategy. This combination reduces the risk of spam and sybil
        attacks.
      </UiMessage>
      <FormStrategiesStrategyActive
        v-for="strategy in strategies"
        :key="strategy.id"
        class="mb-3"
        :network-id="networkId"
        :strategy="strategy"
        @edit-strategy="handleEditStrategy"
        @delete-strategy="handleRemoveStrategy"
      />
    </div>
    <UiButton
      v-if="strategies.length < strategiesLimit"
      class="w-full flex items-center justify-center gap-1"
      @click="isStrategiesModalOpen = true"
    >
      <IH-plus class="shrink-0 size-[16px]" />
      Add strategy
    </UiButton>
  </UiContainerSettings>
  <teleport to="#modal">
    <ModalStrategies
      :open="isStrategiesModalOpen"
      :network-id="networkId"
      @add-strategy="handleAddStrategy"
      @close="isStrategiesModalOpen = false"
    />
    <ModalEditStrategy
      v-if="editedStrategy"
      with-network-selector
      :open="isEditStrategyModalOpen"
      :network-id="networkId"
      :initial-network="editedStrategy.chainId ?? snapshotChainId"
      :strategy-address="editedStrategy.address"
      :definition="editedStrategy.paramsDefinition"
      :initial-state="editedStrategy.params"
      :custom-error-validation="validateStrategy"
      @save="handleSaveStrategy"
      @close="isEditStrategyModalOpen = false"
    />
  </teleport>
</template>
