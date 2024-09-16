<script setup lang="ts">
import { shorten } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { StrategyConfig } from '@/networks/types';
import { NetworkID } from '@/types';

type Strategy = Pick<
  StrategyConfig,
  'id' | 'address' | 'name' | 'params' | 'generateSummary' | 'paramsDefinition'
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
</script>

<template>
  <div
    class="flex justify-between items-center rounded-lg border px-4 py-3 text-skin-link"
  >
    <div class="flex flex-col">
      <div class="flex min-w-0 leading-5 mb-1">
        <div class="whitespace-nowrap">{{ strategy.name }}</div>
        <div
          v-if="strategy.generateSummary"
          class="ml-2 pr-2 text-skin-text truncate"
        >
          {{ strategy.generateSummary(strategy.params) }}
        </div>
      </div>
      <AppLink
        v-if="strategy.address"
        :to="network.helpers.getExplorerUrl(strategy.address, 'contract')"
        class="text-skin-text leading-5"
      >
        <UiStamp
          :id="strategy.address"
          type="avatar"
          :size="18"
          class="mr-2 !rounded"
        />
        {{ shorten(strategy.address) }}
      </AppLink>
    </div>
    <div
      v-if="!readOnly"
      class="flex gap-3"
      :class="{
        'self-start': strategy.address
      }"
    >
      <button
        v-if="strategy.paramsDefinition"
        type="button"
        @click="$emit('editStrategy', strategy)"
      >
        <IH-pencil />
      </button>
      <button type="button" @click="$emit('deleteStrategy', strategy)">
        <IH-trash />
      </button>
    </div>
  </div>
</template>
