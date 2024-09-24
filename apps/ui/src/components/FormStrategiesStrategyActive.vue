<script setup lang="ts">
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getUrl, shorten } from '@/helpers/utils';
import { getNetwork, offchainNetworks } from '@/networks';
import { StrategyConfig } from '@/networks/types';
import { NetworkID } from '@/types';

type Networks = typeof networks;
type NetworkDetails = Networks[keyof Networks];

type Strategy = Pick<
  StrategyConfig,
  | 'id'
  | 'address'
  | 'name'
  | 'chainId'
  | 'params'
  | 'generateSummary'
  | 'paramsDefinition'
>;

const props = defineProps<{
  readOnly?: boolean;
  networkId: NetworkID;
  strategy: Strategy;
}>();

defineEmits<{
  (e: 'editStrategy', strategy: Strategy);
  (e: 'deleteStrategy', strategy: Strategy);
}>();

const network = computed(() => getNetwork(props.networkId));

const strategyNetworkDetails = computed<NetworkDetails>(() => {
  if (!props.strategy.chainId) return null;
  if (!(props.strategy.chainId in networks)) return null;

  return networks[props.strategy.chainId];
});
</script>

<template>
  <div class="rounded-lg border px-4 py-3 text-skin-link leading-[18px]">
    <div class="flex justify-between items-center">
      <div class="flex min-w-0">
        <div class="whitespace-nowrap">{{ strategy.name }}</div>
        <div
          v-if="strategy.generateSummary"
          class="ml-2 pr-2 text-skin-text truncate"
        >
          {{ strategy.generateSummary(strategy.params) }}
        </div>
      </div>
      <div v-if="!readOnly" class="flex gap-3">
        <button
          v-if="
            strategy.paramsDefinition || offchainNetworks.includes(networkId)
          "
          type="button"
          @click="$emit('editStrategy', strategy)"
        >
          <IH-pencil />
        </button>
        <button type="button" @click="$emit('deleteStrategy', strategy)">
          <IH-trash />
        </button>
        <a
          v-if="strategy.address"
          :href="network.helpers.getExplorerUrl(strategy.address, 'strategy')"
          target="_blank"
          class="text-skin-link"
        >
          <IH-information-circle />
        </a>
      </div>
    </div>
    <div class="flex flex-col gap-2 mt-3 empty:mt-0">
      <div
        v-if="strategyNetworkDetails"
        class="flex gap-2 justify-between items-center overflow-hidden"
      >
        <span class="font-medium">Network</span>
        <div class="flex gap-1 items-center">
          <img
            :src="getUrl(strategyNetworkDetails.logo) || undefined"
            class="size-3"
          />
          <span class="text-skin-text truncate">
            {{ strategyNetworkDetails.name }}
          </span>
        </div>
      </div>
      <div
        v-if="strategy.params.symbol"
        class="flex gap-2 justify-between items-center"
      >
        <span class="font-medium">Symbol</span>
        <span class="text-skin-text">
          {{ shorten(strategy.params.symbol, 'symbol') }}
        </span>
      </div>
    </div>
  </div>
</template>
