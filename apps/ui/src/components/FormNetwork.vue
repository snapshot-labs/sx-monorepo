<script setup lang="ts">
import { getUrl } from '@/helpers/utils';
import type { NetworkID } from '@/types';
import type { Network } from '@/networks/types';

const model = defineModel<NetworkID>({
  required: true
});

defineProps<{
  networks: Record<NetworkID, Network>;
}>();
</script>

<template>
  <div class="mb-2">
    <h3>Space network</h3>
    <div class="grid grid-cols-auto gap-3 pt-4 mb-3">
      <button
        v-for="(network, id) in networks"
        :key="id"
        type="button"
        :class="{ 'border-skin-link': id === model }"
        class="flex items-center rounded-lg border px-4 py-3 text-skin-link cursor-pointer"
        @click="model = id"
      >
        <img :src="getUrl(network.avatar) ?? undefined" class="w-[32px] h-[32px] mr-3 rounded-lg" />
        {{ network.name }}
      </button>
    </div>
  </div>
</template>
