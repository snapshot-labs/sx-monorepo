<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div v-tippy="{ content: title }">
    <slot />
  </div>
</template>
