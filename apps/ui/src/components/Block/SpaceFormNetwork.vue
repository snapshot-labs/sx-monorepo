<script setup lang="ts">
import { enabledNetworks, getNetwork } from '@/networks';
import type { NetworkID } from '@/types';

defineProps<{
  modelValue: NetworkID;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: NetworkID);
}>();

const availableNetworks = enabledNetworks.map(id => ({
  id,
  name: getNetwork(id).name
}));
</script>

<template>
  <div class="mb-4">
    <h3>Space network</h3>
    <div class="grid grid-cols-auto gap-3 pt-4">
      <button
        v-for="network in availableNetworks"
        :key="network.id"
        class="bg-skin-active rounded px-2 py-4 hover:bg-skin-hover"
        :class="{
          'bg-green hover:bg-green text-white': network.id === modelValue
        }"
        @click="emit('update:modelValue', network.id)"
      >
        {{ network.name }}
      </button>
    </div>
  </div>
</template>
