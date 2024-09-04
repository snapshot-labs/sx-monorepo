<script setup lang="ts">
import { getCacheHash, getStampUrl } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';
import { NetworkID } from '@/types';

const props = withDefaults(
  defineProps<{
    space: { id: string; cover: string; avatar: string; network: NetworkID };
    size?: 'sm' | 'lg';
  }>(),
  { size: 'lg' }
);

const width = props.size === 'sm' ? 450 : 1500;
const height = props.size === 'sm' ? 120 : 400;

const cb = computed(() => getCacheHash(props.space.cover));
</script>

<template>
  <UiStamp
    v-if="space.cover"
    :id="space.id"
    :width="width"
    :height="height"
    :cb="cb"
    type="space-cover-sx"
    class="object-cover !rounded-none size-full"
  />
  <div v-else class="w-full h-full overflow-hidden">
    <div
      class="space-fallback-cover"
      :class="[size]"
      :style="{
        'background-image': `url(${getStampUrl(
          offchainNetworks.includes(space.network) ? 'space' : 'space-sx',
          space.id,
          50,
          getCacheHash(space.avatar)
        )}`
      }"
    />
  </div>
</template>

<style lang="scss" scoped>
.space-fallback-cover {
  @apply bg-cover bg-center w-full h-full;

  &.lg:after {
    backdrop-filter: blur(150px) contrast(0.9) saturate(1.3);
  }

  &::after {
    // NOTE: Width and height are scaled up so that blur will always cover underlying images
    // At certain sizes we get 1px that is not blurred
    @apply absolute h-[101%] w-[101%] pointer-events-none;
    content: '';
    backdrop-filter: blur(50px) contrast(0.9) saturate(1.3);
  }
}
</style>
