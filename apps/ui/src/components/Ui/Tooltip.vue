<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div v-tippy="{ content: title }" class="inline-block relative">
    <slot />
  </div>
</template>
