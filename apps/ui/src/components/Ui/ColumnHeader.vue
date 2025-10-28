<script setup lang="ts">
const container = ref<HTMLElement | null>(null);

withDefaults(
  defineProps<{
    stickyBehavior?: 'with-section' | 'without-section';
  }>(),
  {
    stickyBehavior: 'with-section'
  }
);

defineExpose({
  container
});
</script>

<template>
  <div
    ref="container"
    class="flex px-4 bg-skin-bg border-b w-full font-medium z-10 sticky"
    :class="{
      'top-header-with-section-height-with-offset lg:top-header-with-section-height':
        stickyBehavior === 'with-section',
      'top-header-height-with-offset lg:top-header-height':
        stickyBehavior === 'without-section'
    }"
  >
    <slot />
  </div>
</template>
