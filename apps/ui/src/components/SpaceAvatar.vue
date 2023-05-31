<script setup lang="ts">
import sha3 from 'js-sha3';

const props = withDefaults(
  defineProps<{
    space: { id: string; avatar: string };
    size: number;
  }>(),
  {
    size: 22
  }
);

const cb = computed(() =>
  props.space.avatar ? sha3.sha3_256(props.space.avatar).slice(0, 16) : undefined
);
</script>

<template>
  <Stamp :id="space.id" :size="size" :cb="cb" type="space-sx" />
</template>
