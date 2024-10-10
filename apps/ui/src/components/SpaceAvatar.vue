<script setup lang="ts">
import { getCacheHash } from '@/helpers/utils';
import { NetworkID } from '@/types';

const props = withDefaults(
  defineProps<{
    space: { id: string; avatar: string; network: NetworkID };
    size: number;
  }>(),
  {
    size: 22
  }
);

const cb = computed(() => getCacheHash(props.space.avatar));
</script>

<template>
  <UiStamp
    :id="`${space.network}:${space.id}`"
    :size="size"
    :cb="cb"
    class="!bg-skin-bg"
    type="space"
  />
</template>
