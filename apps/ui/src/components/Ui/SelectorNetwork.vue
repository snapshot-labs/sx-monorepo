<script setup lang="ts">
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
    networksListKind?: 'full' | 'builtin' | 'offchain';
    networksFilter?: unknown[];
  };
}>();

const { networks } = useOffchainNetworksList(props.definition.networkId);

const allOptions = computed(() => {
  const networksListKind = props.definition.networksListKind;
  if (networksListKind === 'full' || networksListKind === 'offchain') {
    const baseNetworks = networks.value
      .filter(network => {
        if (
          props.definition.networkId === 's' &&
          'testnet' in network &&
          network.testnet
        ) {
          return false;
        }

        return true;
      })
      .map(network => ({
        id: network.chainId,
        name: network.name,
        icon: h('img', {
          src: getUrl(network.logo),
          alt: network.name,
          class: 'rounded-full'
        })
      }));
    if (networksListKind === 'offchain') return baseNetworks;

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

const options = computed(() => {
  const networksFilter = props.definition.networksFilter;

  if (!networksFilter) return allOptions.value;

  return allOptions.value.filter(option => networksFilter.includes(option.id));
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
