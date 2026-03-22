<script setup lang="ts">
withDefaults(
  defineProps<{
    sticky?: boolean;
  }>(),
  {
    sticky: true
  }
);
</script>

<template>
  <div
    class="flex bg-skin-bg border-b w-full font-medium"
    :class="{
      'sticky z-10 top-header-with-section-height-with-offset lg:top-header-with-section-height':
        sticky
    }"
  >
    <slot />
  </div>
</template>
