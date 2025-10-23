<script setup lang="ts">
import { Connector } from '@/networks/types';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'login', connector: Connector): void;
  (e: 'close'): void;
}>();
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3 v-text="'Change wallet'" />
    </template>
    <div class="m-4 flex flex-col gap-2">
      <Connectors @click="(connector: Connector) => emit('login', connector)" />
    </div>
  </UiModal>
</template>
