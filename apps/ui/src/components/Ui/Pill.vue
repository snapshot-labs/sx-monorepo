<script setup lang="ts">
defineProps<{
  variant?: 'accent' | 'primary';
}>();
</script>

<template>
  <span class="pill" :class="variant">
    <slot />
  </span>
</template>

<style lang="scss" scoped>
.pill {
  @apply inline-block text-[13px] rounded-full px-1.5 bg-skin-border text-skin-link;

  &.accent {
    @apply bg-skin-text text-skin-accent-foreground leading-[13px] h-fit;
  }

  &.primary {
    @apply bg-skin-link text-skin-bg;
  }
}
</style>
