<script setup lang="ts">
import { Connector, ConnectorType } from '@/networks/types';

const props = defineProps<{
  open: boolean;
  supportedConnectors: ConnectorType[];
}>();
const emit = defineEmits<{
  (e: 'pick', connector: Connector): void;
  (e: 'close'): void;
}>();

const { open } = toRefs(props);
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3 v-text="'Log in'" />
    </template>
    <div class="m-4 space-y-2 flex flex-col">
      <Connectors
        :supported-connectors="supportedConnectors"
        @click="(connector: Connector) => emit('pick', connector)"
      />
    </div>
  </UiModal>
</template>
