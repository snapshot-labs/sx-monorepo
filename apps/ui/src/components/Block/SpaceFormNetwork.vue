<script setup lang="ts">
import { enabledNetworks, getNetwork } from '@/networks';
import { getUrl } from '@/helpers/utils';
import type { NetworkID } from '@/types';

defineProps<{
  modelValue: NetworkID;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: NetworkID);
}>();

const availableNetworks = enabledNetworks.map(id => {
  const { name, avatar } = getNetwork(id);
  return { id, name, avatar };
});
</script>

<template>
  <div class="mb-2">
    <h3>Space network</h3>
    <div class="grid grid-cols-auto gap-3 pt-4 mb-3">
      <div
        v-for="network in availableNetworks"
        :key="network.id"
        :class="{ 'border-skin-link': network.id === modelValue }"
        class="flex items-center rounded-lg border px-4 py-3 text-skin-link cursor-pointer"
        @click="emit('update:modelValue', network.id)"
      >
        <img :src="getUrl(network.avatar) ?? undefined" class="w-[32px] h-[32px] mr-3 rounded-lg" />
        {{ network.name }}
      </div>
    </div>
  </div>
</template>
