<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<template>
  <div class="mb-4 mx-4 max-w-[592px] flex-grow pb-[100px]">
    <h3
      v-if="title"
      :class="{
        'mb-4': !description
      }"
    >
      {{ title }}
    </h3>
    <span v-if="description" class="mb-4 inline-block">
      {{ description }}
    </span>
    <slot />
  </div>
</template>
