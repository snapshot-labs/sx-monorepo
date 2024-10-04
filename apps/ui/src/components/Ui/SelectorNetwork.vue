<script setup lang="ts">
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getUrl } from '@/helpers/utils';
import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
import { BaseDefinition, NetworkID } from '@/types';

const network = defineModel<string | number | null>({
  required: true
});

const props = defineProps<{
  definition: BaseDefinition<string | number | null> & {
    networkId: NetworkID;
  };
}>();

const options = computed(() => {
  if (offchainNetworks.includes(props.definition.networkId)) {
    return Object.entries(networks)
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
        id: Number(id),
        name: network.name,
        icon: h('img', {
          src: getUrl(network.logo),
          alt: network.name,
          class: 'rounded-full'
        })
      }));
  }

  return enabledNetworks
    .map(id => {
      const { name, readOnly, avatar } = getNetwork(id);

      return {
        id,
        name,
        icon: h('img', {
          src: getUrl(avatar),
          alt: name,
          class: 'rounded-full'
        }),
        readOnly
      };
    })
    .filter(network => !network.readOnly);
});
</script>

<template>
  <Combobox
    v-model="network"
    :definition="{
      ...definition,
      enum: options.map(c => c.id),
      options: options,
      examples: ['Select network']
    }"
  />
</template>
