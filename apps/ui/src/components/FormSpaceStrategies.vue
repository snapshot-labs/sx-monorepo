<script setup lang="ts">
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getUrl } from '@/helpers/utils';
import { StrategyConfig } from '@/networks/types';
import { NetworkID } from '@/types';

const snapshotChainId = defineModel<string>('snapshotChainId', {
  required: true
});
const strategies = defineModel<StrategyConfig[]>('strategies', {
  required: true
});

const props = defineProps<{
  networkId: NetworkID;
}>();

function removeStrategy(strategy: StrategyConfig) {
  strategies.value = strategies.value.filter(s => s.id !== strategy.id);
}

const SPACE_CATEGORIES = Object.entries(networks)
  .filter(([, network]) => {
    if (props.networkId === 's' && 'testnet' in network && network.testnet) {
      return false;
    }

    return true;
  })
  .map(([id, network]) => ({
    id,
    name: network.name,
    icon: h('img', {
      src: getUrl(network.logo),
      alt: network.name
    })
  }));
</script>

<template>
  <h4 class="eyebrow mb-2 font-medium">Strategies</h4>
  <div class="s-box mb-4">
    <Combobox
      v-model="snapshotChainId"
      :definition="{
        type: 'string',
        enum: SPACE_CATEGORIES.map(c => c.id),
        title: 'Network',
        options: SPACE_CATEGORIES,
        examples: ['Select network']
      }"
    />
  </div>
  <UiContainerSettings
    title="Select up to 8 strategies"
    description="(Voting power is cumulative)"
  >
    <div class="space-y-3 mb-3">
      <div v-if="strategies.length === 0">No strategies selected</div>
      <FormStrategiesStrategyActive
        v-for="strategy in strategies"
        :key="strategy.id"
        class="mb-3"
        :network-id="networkId"
        :strategy="strategy"
        @delete-strategy="removeStrategy"
      />
    </div>
    <UiButton class="w-full flex items-center justify-center gap-1">
      <IH-plus class="shrink-0 size-[16px]" />
      Add strategy
    </UiButton>
  </UiContainerSettings>
</template>
