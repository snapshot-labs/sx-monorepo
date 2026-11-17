<script setup lang="ts">
import { getNetworkDetails } from '@/helpers/networks';
import { getUrl } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { ChainId, NetworkID } from '@/types';

type NetworkData = {
  name: string;
  avatar: string;
};

const props = withDefaults(
  defineProps<{
    id?: NetworkID | null;
    chainId?: ChainId | null;
    size?: number;
  }>(),
  {
    size: 16
  }
);

const networkData = computed<NetworkData | null>(() => {
  if (props.id) {
    try {
      const network = getNetwork(props.id);
      return {
        name: network.name,
        avatar: network.avatar
      };
    } catch {}
  }

  if (props.chainId) {
    const network = getNetworkDetails(props.chainId);
    if (network) return { name: network.name, avatar: network.logo };
  }

  return null;
});
</script>

<template>
  <div class="relative">
    <slot />
    <img
      v-if="networkData && size !== 0"
      :src="getUrl(networkData.avatar) ?? undefined"
      :title="networkData.name"
      :style="{
        width: `${size}px`,
        height: `${size}px`
      }"
      :alt="networkData.name"
      class="absolute rounded-full -bottom-1 -right-1 border-2 bg-skin-border border-skin-bg"
    />
  </div>
</template>
