<script setup lang="ts">
const container = ref<HTMLElement | null>(null);

defineExpose({
  container
});
</script>

<template>
  <div
    ref="container"
    class="flex px-4 bg-skin-bg border-b w-full font-medium top-header-with-section-height lg:top-header-with-section-height-with-offset z-10 sticky"
  >
    <slot />
  </div>
</template>
