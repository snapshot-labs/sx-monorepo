<script setup lang="ts">
import { getUrl } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

const props = withDefaults(
  defineProps<{
    id: string;
    size?: number;
  }>(),
  {
    size: 16
  }
);

const [network] = props.id.split(':');

const currentNetwork = computed(() => {
  try {
    return getNetwork(network as NetworkID);
  } catch (e) {
    return null;
  }
});
</script>

<template>
  <div class="relative">
    <img
      :src="(currentNetwork && getUrl(currentNetwork.avatar)) ?? undefined"
      :title="(currentNetwork && currentNetwork.name) ?? undefined"
      :style="{
        width: `${size}px`,
        height: `${size}px`
      }"
      class="absolute rounded-full -bottom-1 -right-1 border-2 bg-skin-border border-skin-bg"
    />
    <slot />
  </div>
</template>
