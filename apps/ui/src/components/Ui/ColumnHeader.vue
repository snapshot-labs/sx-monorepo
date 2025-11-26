<script setup lang="ts">
const container = ref<HTMLElement | null>(null);

withDefaults(
  defineProps<{
    sticky?: boolean;
  }>(),
  {
    sticky: true
  }
);

defineExpose({
  container
});
</script>

<template>
  <div
    ref="container"
    class="flex px-4 bg-skin-bg border-b w-full font-medium"
    :class="{
      'sticky z-10  top-header-with-section-height lg:top-header-with-section-height-with-offset':
        sticky
    }"
  >
    <slot />
  </div>
</template>
