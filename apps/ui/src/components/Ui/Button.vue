<script setup lang="ts">
import { RouteLocationRaw } from 'vue-router';

withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset';
    primary?: boolean;
    pill?: boolean;
    loading?: boolean;
    disabled?: boolean;
    to?: RouteLocationRaw;
  }>(),
  {
    type: 'button',
    primary: false,
    pill: false,
    loading: false,
    disabled: false
  }
);
</script>

<template>
  <AppLink
    v-if="to"
    :to="to"
    :class="{
      primary: primary,
      'w-[44px] !px-0': pill
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
      'w-[44px] px-0': loading,
      'w-[44px] !px-0': pill,
      'px-3.5': !loading || ($attrs.class as 'string')?.includes('w-full')
    }"
    class="button"
  >
    <UiLoading v-if="loading" :inverse="primary" />
    <slot v-else />
  </button>
</template>

<style lang="scss" scoped>
.button {
  @apply rounded-full leading-[100%] border h-[44px] text-skin-link bg-skin-bg;

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
