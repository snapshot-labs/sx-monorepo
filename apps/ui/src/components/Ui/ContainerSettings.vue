<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<template>
  <div class="max-w-[592px]">
    <div v-if="title || description || $slots.actions" class="mb-4">
      <UiRow
        v-if="$slots.actions || title"
        :gap="8"
        align="center"
        justify="between"
      >
        <h3 v-if="title" v-text="title" />
        <div />
        <slot name="actions" />
      </UiRow>
      <span v-if="description" class="inline-block" v-text="description" />
    </div>
    <slot />
  </div>
</template>
