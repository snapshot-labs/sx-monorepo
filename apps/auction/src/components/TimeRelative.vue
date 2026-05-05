<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    time: number;
    withoutSuffix?: boolean;
  }>(),
  { withoutSuffix: false }
);

const relativeTime = useRelativeTime(() => props.time, props.withoutSuffix);
</script>

<template>
  <slot :relative-time="relativeTime">{{ relativeTime }}</slot>
</template>
