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
    class="rounded-full leading-[100%] border button px-3.5 h-[46px] text-skin-link bg-skin-bg"
  >
    <UiLoading v-if="loading" :inverse="primary" />
    <slot v-else />
  </button>
</template>

<style lang="scss" scoped>
.button {
  &:disabled:deep() {
    color: rgba(var(--border)) !important;
    cursor: not-allowed;
  }

  &.primary {
    @apply bg-skin-link text-skin-bg border-skin-link;

    &:disabled:deep() {
      @apply bg-skin-link/40 border-transparent;

      .loading,
      .loading.inverse {
        svg {
          path {
            stroke: rgba(var(--primary));
          }

          stop {
            stop-color: rgba(var(--primary));
          }
        }
      }
    }
  }
}
</style>
