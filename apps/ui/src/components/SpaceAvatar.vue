<script setup lang="ts">
import { getCacheHash } from '@/helpers/utils';

const props = withDefaults(
  defineProps<{
    space: { id: string; avatar: string };
    size: number;
  }>(),
  {
    size: 22
  }
);

const cb = computed(() => getCacheHash(props.space.avatar));
</script>

<template>
  <Stamp :id="space.id" :size="size" :cb="cb" type="space-sx" />
</template>
