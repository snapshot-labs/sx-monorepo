<script setup lang="ts">
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getUrl } from '@/helpers/utils';
import { enabledNetworks, getNetwork } from '@/networks';
import { METADATA as STARKNET_NETWORK_METADATA } from '@/networks/starknet';
import { BaseDefinition, NetworkID } from '@/types';

const network = defineModel<string | number | null>({
  required: true
});

const props = defineProps<{
  definition: BaseDefinition<string | number | null> & {
    networkId: NetworkID;
    networksListKind?: 'full' | 'builtin';
  };
}>();

const options = computed(() => {
  if (props.definition.networksListKind === 'full') {
    const baseNetworks = Object.entries(networks)
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

    return [
      ...baseNetworks,
      ...Object.values(STARKNET_NETWORK_METADATA)
        .filter(metadata => {
          if (
            props.definition.networkId === 's' &&
            metadata.name.includes('Sepolia')
          ) {
            return false;
          }

          return true;
        })
        .map(metadata => ({
          id: metadata.chainId,
          name: metadata.name,
          icon: h('img', {
            src: getUrl(metadata.avatar),
            alt: metadata.name,
            class: 'rounded-full'
          })
        }))
    ];
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
