<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string | number;
    variant?: 'default' | 'secondary' | 'primary';
  }>(),
  { variant: 'default' }
);
</script>

<template>
  <span class="pill" :class="variant">
    <slot>{{ label }}</slot>
  </span>
</template>

<style lang="scss" scoped>
.pill {
  @apply inline-block text-[13px] leading-5 rounded-full px-1.5 bg-skin-border text-skin-link;

  &.secondary {
    @apply bg-skin-text text-skin-accent-foreground;
  }

  &.primary {
    @apply bg-skin-link text-skin-bg;
  }
}
</style>
