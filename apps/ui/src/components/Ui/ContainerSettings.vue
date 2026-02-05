<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<template>
  <div class="max-w-[592px]">
    <div v-if="title || description || $slots.actions" class="mb-4">
      <div
        v-if="$slots.actions || title"
        class="flex items-center justify-between gap-2"
      >
        <h3 v-if="title" v-text="title" />
        <div />
        <slot name="actions" />
      </div>
      <span v-if="description" class="inline-block" v-text="description" />
    </div>
    <slot />
  </div>
</template>
