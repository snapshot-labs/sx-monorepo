<script setup lang="ts">
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';
import { getUrl } from '@/helpers/utils';

const props = withDefaults(
  defineProps<{
    id: string;
    size?: number;
    width?: number;
    height?: number;
    cb?: string;
  }>(),
  {
    size: 22
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
      class="absolute rounded-full w-[16px] h-[16px] -bottom-1 -right-1 border border-skin-bg"
    />
    <UiStamp :id="id" type="token" :size="size" />
  </div>
</template>
