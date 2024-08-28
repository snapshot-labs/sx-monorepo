<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
}>();
</script>

<template>
  <div class="mb-4">
    <h3 class="text-md leading-6">{{ title }}</h3>
    <span class="mb-4 inline-block">
      {{ description }}
    </span>
    <slot />
  </div>
</template>
