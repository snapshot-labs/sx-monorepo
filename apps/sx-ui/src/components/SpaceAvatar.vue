<script setup lang="ts">
import { getCacheHash } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';
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
  <Stamp
    :id="space.id"
    :size="size"
    :cb="cb"
    :type="offchainNetworks.includes(space.network) ? 'space' : 'space-sx'"
  />
</template>
