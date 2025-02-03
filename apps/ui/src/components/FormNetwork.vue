<script setup lang="ts">
import { getUrl } from '@/helpers/utils';
import { enabledReadWriteNetworks, getNetwork } from '@/networks';
import { NetworkID } from '@/types';

const model = defineModel<NetworkID>({
  required: true
});

defineProps<{
  title: string;
  description?: string;
}>();

const availableNetworks = enabledReadWriteNetworks.map(id => {
  const { name, avatar, readOnly } = getNetwork(id);
  return { id, name, avatar, readOnly };
});
</script>

<template>
  <UiContainerSettings :title="title" :description="description">
    <div class="grid grid-cols-auto gap-3 mb-3">
      <button
        v-for="network in availableNetworks"
        :key="network.id"
        type="button"
        :class="{ 'border-skin-link': network.id === model }"
        class="flex items-center rounded-lg border px-4 py-3 text-skin-link cursor-pointer"
        @click="model = network.id"
      >
        <img
          :src="getUrl(network.avatar) ?? undefined"
          class="size-[32px] mr-3 rounded-lg"
        />
        {{ network.name }}
      </button>
    </div>
  </UiContainerSettings>
</template>
