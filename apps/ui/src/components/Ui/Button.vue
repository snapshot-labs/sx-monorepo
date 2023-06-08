<script setup>
defineProps({
  primary: {
    type: Boolean,
    default: false
  },
  loading: Boolean,
  type: String,
  disabled: {
    type: Boolean,
    default: false
  }
});
</script>

<template>
  <button
    :type="type || 'button'"
    :disabled="disabled || loading"
    :class="primary && 'primary'"
    class="rounded-full leading-[100%] border button px-[20px] h-[46px] outline-0 text-skin-link focus-within:border-skin-link bg-skin-bg"
  >
    <UiLoading v-if="loading" :fill-white="primary" />
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
