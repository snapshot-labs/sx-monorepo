<script setup lang="ts">
import snapshotJsNetworks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getUrl } from '@/helpers/utils';
import { METADATA as STARKNET_NETWORK_METADATA } from '@/networks/starknet';
import { BaseDefinition } from '@/types';

const STARKNET_NETWORKS = Object.fromEntries(
  Object.values(STARKNET_NETWORK_METADATA).map(metadata => [
    metadata.chainId,
    {
      name: metadata.name,
      logoUrl: getUrl(metadata.avatar)
    }
  ])
);

type NetworkDetails = {
  name: string;
  logoUrl: string | null;
};

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    showPicker?: boolean;
    path?: string;
    definition?: BaseDefinition<string> & {
      chainId?: number | string;
    };
    required?: boolean;
  }>(),
  {
    showPicker: true
  }
);

const emit = defineEmits<{
  (e: 'pick', path: string);
}>();

const isStarknetChainId = computed(() => {
  return (
    typeof props.definition?.chainId === 'string' &&
    props.definition?.chainId in STARKNET_NETWORKS
  );
});

const networkDetails = computed<NetworkDetails | null>(() => {
  const chainId = props.definition?.chainId;

  if (!chainId) return null;

  if (isStarknetChainId.value) {
    return STARKNET_NETWORKS[chainId];
  } else if (chainId in snapshotJsNetworks) {
    const network = snapshotJsNetworks[chainId];
    return {
      name: network.name,
      logoUrl: getUrl(network.logo)
    };
  }

  return null;
});

const definition = computed(() => {
  const definition = props.definition;
  if (!definition) return null;

  return {
    ...definition,
    examples: definition.examples ?? [
      !isStarknetChainId.value && definition.format === 'ens-or-address'
        ? 'Address or ENS'
        : '0x0000....'
    ]
  };
});
</script>

<template>
  <div class="relative">
    <div v-if="showPicker" class="absolute top-3.5 right-3 z-10">
      <button type="button" @click="emit('pick', path || '')">
        <IH-identification />
      </button>
    </div>
    <UiTooltip
      v-if="networkDetails"
      :title="networkDetails.name"
      class="!absolute z-10 left-3 top-[29px]"
    >
      <img
        :src="networkDetails.logoUrl ?? undefined"
        class="size-3.5 rounded-full"
      />
    </UiTooltip>
    <UiInputString
      :definition="definition"
      :required="required"
      v-bind="$attrs as any"
      class="!pr-7"
      :class="{
        '!pl-[42px]': !!networkDetails
      }"
    />
  </div>
</template>
