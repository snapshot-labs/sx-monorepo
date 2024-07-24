<script setup lang="ts">
withDefaults(
  defineProps<{
    primary?: boolean;
    loading?: boolean;
    disabled?: boolean;
    size?: number;
  }>(),
  {
    primary: false,
    loading: false,
    disabled: false,
    size: 46
  }
);
</script>

<template>
  <UiButton
    :disabled="disabled || loading"
    :loading="loading"
    :class="`!px-0 shrink-0 w-[${size}px] !h-[${size}px]`"
  >
    <slot />
  </UiButton>
</template>
