<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset';
    primary?: boolean;
    loading?: boolean;
    disabled?: boolean;
  }>(),
  {
    type: 'button',
    primary: false,
    loading: false,
    disabled: false
  }
);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="primary && 'primary'"
    class="rounded-full leading-[100%] border button px-[20px] h-[46px] text-skin-link bg-skin-bg"
  >
    <UiLoading v-if="loading" :inverse="primary" />
    <slot v-else />
  </button>
</template>

<style scoped lang="scss">
.button {
  &:disabled {
    color: var(--border-color) !important;
    cursor: not-allowed;
  }

  &.primary {
    @apply bg-skin-link text-skin-bg border-skin-link;
  }
}
</style>
