<script setup lang="ts">
import { enabledNetworks, getNetwork } from '@/networks';
import { ETH_CONTRACT } from '@/helpers/constants';
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
  <div class="mb-2">
    <h3>Space network</h3>
    <div class="grid grid-cols-auto gap-3 pt-4">
      <div
        v-for="network in availableNetworks"
        :key="network.id"
        :class="{ 'border-skin-link': network.id === modelValue }"
        class="flex items-center rounded-lg border px-4 py-3 mb-3 text-skin-link"
        @click="emit('update:modelValue', network.id)"
      >
        <Stamp :id="ETH_CONTRACT" type="token" :size="32" class="mr-3" />
        {{ network.name }}
      </div>
    </div>
  </div>
</template>
