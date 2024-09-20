<script setup lang="ts">
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getUrl } from '@/helpers/utils';
import { NetworkID } from '@/types';

const snapshotChainId = defineModel<string>('snapshotChainId', {
  required: true
});

const props = defineProps<{
  networkId: NetworkID;
}>();

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
    <UiButton class="w-full flex items-center justify-center gap-1">
      <IH-plus class="shrink-0 size-[16px]" />
      Add strategy
    </UiButton>
  </UiContainerSettings>
</template>
