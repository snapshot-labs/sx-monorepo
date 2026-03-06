<script setup lang="ts">
import snapshotJsNetworks from '@snapshot-labs/snapshot.js/src/networks.json';
import { FieldDefinition } from '@snapshot-labs/tune';
import { getUrl } from '@/helpers/utils';

type NetworkDetails = {
  name: string;
  logoUrl: string | null;
};

defineOptions({ inheritAttrs: false });

const model = defineModel<string>();

const props = defineProps<{
  path?: string;
  definition?: FieldDefinition<string> & {
    chainId?: number | string;
    showControls?: boolean;
  };
  required?: boolean;
}>();

const emit = defineEmits<{
  (e: 'pick', path: string): void;
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

const shouldShowPicker = computed(() => {
  return props.definition?.showControls ?? true;
});
</script>

<template>
  <UiInputString
    v-model="model"
    :definition="definition"
    :required="required"
    v-bind="$attrs as any"
    :class="{
      '!pl-[42px]': !!networkDetails,
      '!pr-7': shouldShowPicker
    }"
  >
    <template v-if="networkDetails" #prefix>
      <UiTooltip :title="networkDetails.name">
        <img
          :src="networkDetails.logoUrl ?? undefined"
          class="size-3.5 rounded-full"
        />
      </UiTooltip>
    </template>
    <template v-if="shouldShowPicker" #suffix>
      <button
        type="button"
        aria-label="Pick address from contacts"
        @click="emit('pick', path || '')"
      >
        <IH-identification />
      </button>
    </template>
  </UiInputString>
</template>
