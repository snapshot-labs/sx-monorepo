<script setup lang="ts">
import { SPACE_COVER_DIMENSIONS } from '@/helpers/constants';
import { getCacheHash, getStampUrl } from '@/helpers/utils';
import { NetworkID } from '@/types';

const props = withDefaults(
  defineProps<{
    space: { id: string; cover: string; avatar: string; network: NetworkID };
    size?: 'sm' | 'lg';
  }>(),
  { size: 'lg' }
);

const cb = computed(() => getCacheHash(props.space.cover));
</script>

<template>
  <UiStamp
    v-if="space.cover"
    :id="`${space.network}:${space.id}`"
    :width="SPACE_COVER_DIMENSIONS[size].width"
    :height="SPACE_COVER_DIMENSIONS[size].height"
    :cb="cb"
    type="space-cover"
    class="object-cover !rounded-none size-full"
  />
  <div
    v-else
    class="bg-cover bg-center w-full h-full"
    :style="{
      'background-image': `url(${getStampUrl(
        'space',
        `${space.network}:${space.id}`,
        50,
        getCacheHash(space.avatar)
      )}`,
      filter: `blur(${size === 'lg' ? '100' : '50'}px) contrast(0.9) saturate(1.3)`
    }"
  />
</template>
