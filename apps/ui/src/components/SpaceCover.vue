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
    :height="156"
    :cb="cb"
    type="space-cover-sx"
    class="object-cover"
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
  object-fit: cover;

  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    backdrop-filter: blur(50px) contrast(0.9) saturate(1.3);
    pointer-events: none;
  }
}
</style>
