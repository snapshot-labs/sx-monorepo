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
      'sticky z-10 top-header-offset lg:top-header bg-skin-bg': sticky
    }"
    >{{ label }}</UiEyebrow
  >
</template>
