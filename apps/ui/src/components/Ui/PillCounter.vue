<script setup lang="ts">
defineProps<{
  variant?: 'default' | 'accent' | 'highlighted';
}>();
</script>

<template>
  <span
    class="inline-block text-[13px] rounded-full px-1.5"
    :class="{
      'bg-skin-border text-skin-link': !variant || variant === 'default',
      'bg-skin-text text-skin-accent-foreground leading-[13px] h-fit':
        variant === 'accent',
      'bg-skin-link text-skin-bg': variant === 'highlighted'
    }"
  >
    <slot />
  </span>
</template>
