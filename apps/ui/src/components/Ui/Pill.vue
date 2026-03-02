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
  <span
    class="inline-block text-[13px] leading-5 rounded-full px-1.5"
    :class="{
      'bg-skin-border text-skin-link': variant === 'default',
      'bg-skin-text text-skin-accent-foreground': variant === 'secondary',
      'bg-skin-link text-skin-bg': variant === 'primary'
    }"
  >
    <slot>{{ label }}</slot>
  </span>
</template>
