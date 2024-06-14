<script setup lang="ts">
import sha3 from 'js-sha3';
import { offchainNetworks } from '@/networks';
import { getCacheHash, getStampUrl } from '@/helpers/utils';
import { NetworkID } from '@/types';

const props = defineProps<{
  space: { id: string; cover: string; avatar: string; network: NetworkID };
}>();

const cb = computed(() =>
  props.space.cover ? sha3.sha3_256(props.space.cover).slice(0, 16) : undefined
);
</script>

<template>
  <UiStamp
    v-if="space.cover"
    :id="space.id"
    :width="1500"
    :height="500"
    :cb="cb"
    type="space-cover-sx"
    class="object-cover !rounded-none h-full w-full"
  />
  <div
    v-else
    class="space-fallback-cover"
    :style="{
      'background-image': `url(${getStampUrl(
        offchainNetworks.includes(space.network) ? 'space' : 'space-sx',
        space.id,
        50,
        getCacheHash(space.avatar)
      )}`
    }"
  ></div>
</template>

<style lang="scss" scoped>
.space-fallback-cover {
  @apply object-cover w-full h-full;

  &::after {
    @apply absolute h-full w-full pointer-events-none;

    content: '';
    backdrop-filter: blur(50px) contrast(0.9) saturate(1.3);
  }
}
</style>
