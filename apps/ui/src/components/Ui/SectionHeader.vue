<script setup lang="ts">
defineProps<{
  label: string;
  sticky?: boolean;
}>();
</script>

<template>
  <UiEyebrow
    class="border-b py-2 px-4 text-skin-text"
    :class="{
      'sticky z-20 top-header-height-with-offset lg:top-header-height bg-skin-bg':
        sticky
    }"
    >{{ label }}</UiEyebrow
  >
</template>
