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
    class="rounded-full border button px-[24px] text-skin-link focus-within:border-skin-link bg-skin-block-bg"
    :disabled="disabled || loading"
  >
    <UiLoading v-if="loading" :fill-white="primary" />
    <slot v-else />
  </button>
</template>

<style scoped lang="scss">
.button {
  outline: none;
  height: 46px;
  font-size: 18px;

  &:disabled {
    color: var(--border-color) !important;
    cursor: not-allowed;
  }
}
</style>
