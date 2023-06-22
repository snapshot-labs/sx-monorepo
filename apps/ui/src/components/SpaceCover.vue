<script setup lang="ts">
import sha3 from 'js-sha3';

const props = defineProps<{
  space: { id: string; cover: string };
}>();

const cb = computed(() =>
  props.space.cover ? sha3.sha3_256(props.space.cover).slice(0, 16) : undefined
);
</script>

<template>
  <Stamp :id="space.id" :width="1500" :height="156" :cb="cb" type="space-cover-sx" />
</template>
