<script setup lang="ts">
import { getUrl } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

const props = withDefaults(
  defineProps<{
    id?: string;
    size?: number;
  }>(),
  {
    size: 16
  }
);

const currentNetwork = computed(() => {
  try {
    const [network] = props.id?.split(':') ?? [];
    return getNetwork(network as NetworkID);
  } catch (e) {
    return null;
  }
});
</script>

<template>
  <div class="relative">
    <img
      v-if="currentNetwork"
      :src="getUrl(currentNetwork.avatar) ?? undefined"
      :title="currentNetwork.name"
      :style="{
        width: `${size}px`,
        height: `${size}px`
      }"
      :alt="currentNetwork.name"
      class="absolute rounded-full -bottom-1 -right-1 border-2 bg-skin-border border-skin-bg"
    />
    <slot />
  </div>
</template>
