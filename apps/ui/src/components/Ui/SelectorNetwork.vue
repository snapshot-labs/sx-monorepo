<script setup lang="ts">
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getUrl } from '@/helpers/utils';

const network = defineModel<string>({
  required: true
});

const props = defineProps<{
  networkId: string;
}>();

const spaceCategories = computed(() =>
  Object.entries(networks)
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
    }))
);
</script>

<template>
  <Combobox
    v-model="network"
    :definition="{
      type: 'string',
      enum: spaceCategories.map(c => c.id),
      title: 'Network',
      options: spaceCategories,
      examples: ['Select network']
    }"
  />
</template>
