<script setup lang="ts">
import { RouteLocationRaw } from 'vue-router';

withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset';
    primary?: boolean;
    loading?: boolean;
    disabled?: boolean;
    uniform?: boolean;
    size?: number;
    to?: RouteLocationRaw;
  }>(),
  {
    type: 'button',
    primary: false,
    loading: false,
    disabled: false,
    uniform: false,
    size: 46
  }
);
</script>

<template>
  <AppLink
    v-if="to"
    :to="to"
    :class="{
      primary: primary
    }"
    class="button inline-flex items-center justify-center px-3.5"
  >
    <slot />
  </AppLink>
  <button
    v-else
    :type="type"
    :disabled="disabled || loading"
    :class="{
      primary: primary,
      [`size-[${size}px] px-0`]: loading || uniform,
      'px-3.5':
        (!loading && !uniform) || ($attrs.class as 'string')?.includes('w-full')
    }"
    class="button"
  >
    <UiLoading v-if="loading" :inverse="primary" />
    <slot v-else />
  </button>
</template>

<style lang="scss" scoped>
.button {
  @apply rounded-full leading-[100%] border h-[46px] text-skin-link bg-skin-bg;

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
