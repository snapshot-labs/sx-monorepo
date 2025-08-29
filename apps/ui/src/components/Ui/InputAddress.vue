<script setup lang="ts">
import snapshotJsNetworks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getUrl } from '@/helpers/utils';
import { BaseDefinition } from '@/types';

type NetworkDetails = {
  name: string;
  logoUrl: string | null;
};

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  path?: string;
  definition?: BaseDefinition<string> & {
    chainId?: number | string;
    showPicker?: boolean;
  };
  required?: boolean;
}>();

const emit = defineEmits<{
  (e: 'pick', path: string);
}>();

const networkDetails = computed<NetworkDetails | null>(() => {
  const chainId = props.definition?.chainId;

  if (!chainId) return null;

  if (chainId in snapshotJsNetworks) {
    const network = snapshotJsNetworks[chainId];
    return {
      name: network.name,
      logoUrl: getUrl(network.logo)
    };
  }

  return null;
});
</script>

<template>
  <div class="relative">
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
    <div
      v-if="definition?.showPicker ?? true"
      class="absolute top-3.5 right-3 z-10"
    >
      <button type="button" @click="emit('pick', path || '')">
        <IH-identification />
      </button>
    </div>
  </div>
</template>
