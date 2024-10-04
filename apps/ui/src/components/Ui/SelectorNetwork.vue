<script setup lang="ts">
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getUrl } from '@/helpers/utils';
import { BaseDefinition } from '@/types';

const network = defineModel<string>({
  required: true
});

const props = defineProps<{
  definition: BaseDefinition<string | null> & {
    networkId: string;
  };
}>();

const spaceCategories = computed(() =>
  Object.entries(networks)
    .filter(([, network]) => {
      if (
        props.definition.networkId === 's' &&
        'testnet' in network &&
        network.testnet
      ) {
        return false;
      }

      return true;
    })
    .map(([id, network]) => ({
      id,
      name: network.name,
      icon: h('img', {
        src: getUrl(network.logo),
        alt: network.name,
        class: 'rounded-full'
      })
    }))
);
</script>

<template>
  <Combobox
    v-model="network"
    :definition="{
      ...definition,
      enum: spaceCategories.map(c => c.id),
      options: spaceCategories,
      examples: ['Select network']
    }"
  />
</template>
