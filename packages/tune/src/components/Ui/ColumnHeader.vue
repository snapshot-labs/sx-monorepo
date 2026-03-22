<script setup lang="ts">
defineOptions({
  inheritAttrs: false
});

const container = ref<HTMLElement | null>(null);

withDefaults(
  defineProps<{
    sticky?: boolean;
    scrollableWidth?: string;
  }>(),
  {
    sticky: true,
    scrollableWidth: undefined
  }
);

defineExpose({
  container
});
</script>

<template>
  <div
    ref="container"
    class="flex bg-skin-bg border-b w-full font-medium"
    :class="[
      {
        'sticky z-10 top-header-with-section-height-with-offset lg:top-header-with-section-height':
          sticky,
        'overflow-hidden': scrollableWidth,
        'px-4': !scrollableWidth
      }
    ]"
    v-bind="scrollableWidth ? {} : $attrs"
  >
    <div
      v-if="scrollableWidth"
      v-bind="$attrs"
      class="flex px-4 w-full"
      :style="{ minWidth: scrollableWidth }"
    >
      <slot />
    </div>
    <slot v-else />
  </div>
</template>
