<script setup lang="ts">
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { getUrl } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { ChainId, NetworkID } from '@/types';

type SnapshotJSNetworks = typeof networks;
type SnapshotJSNetwork = SnapshotJSNetworks[keyof SnapshotJSNetworks];

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

  if (props.chainId && typeof props.chainId === 'number') {
    try {
      const network: SnapshotJSNetwork | undefined =
        networks[String(props.chainId)];
      if (!network) return null;

      return {
        name: network.name,
        avatar: network.logo
      };
    } catch (e) {
      return null;
    }
  }

  return null;
});
</script>

<template>
  <div class="relative">
    <img
      v-if="networkData"
      :src="getUrl(networkData.avatar) ?? undefined"
      :title="networkData.name"
      :style="{
        width: `${size}px`,
        height: `${size}px`
      }"
      :alt="networkData.name"
      class="absolute rounded-full -bottom-1 -right-1 border-2 bg-skin-border border-skin-bg"
    />
    <slot />
  </div>
</template>
