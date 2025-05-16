<script setup lang="ts">
const props = defineProps<{
  time: number;
}>();

const relativeTime = useRelativeTime(() => props.time);
</script>

<template>
  <slot :relative-time="relativeTime">{{ relativeTime }}</slot>
</template>
