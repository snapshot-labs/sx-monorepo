<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<template>
  <div class="max-w-[592px]">
    <div
      :class="{
        'mb-4': !description
      }"
    >
      <div class="flex items-center justify-between gap-2">
        <h3 v-if="title" v-text="title" />
        <slot name="actions" />
      </div>
      <span v-if="description" class="mb-4 inline-block" v-text="description" />
    </div>
    <slot />
  </div>
</template>
