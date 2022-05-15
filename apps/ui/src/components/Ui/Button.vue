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
    class="rounded-full leading-[100%] border button px-[20px] h-[46px] outline-0 text-skin-link focus-within:border-skin-link bg-skin-bg"
    :disabled="disabled || loading"
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
}
</style>
