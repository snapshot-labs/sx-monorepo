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

<style lang="scss">
.button {
  &:disabled {
    color: rgba(var(--border)) !important;
    cursor: not-allowed;
  }

  &.primary {
    @apply bg-skin-link text-skin-bg border-skin-link;

    &:disabled {
      @apply bg-skin-bg border-skin-border text-skin-text;

      .loading,
      .loading.inverse {
        svg {
          path {
            stroke: rgba(var(--border));
          }

          stop {
            stop-color: rgba(var(--border));
          }
        }
      }
    }
  }
}
</style>
