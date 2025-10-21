<script setup lang="ts">
import { RouteLocationRaw } from 'vue-router';

const props = withDefaults(
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

const attrs = useAttrs();

const classNames = computed(() => {
  return {
    [`h-[${props.size}px] button`]: true,
    primary: props.primary,
    [`w-[${props.size}px] px-0 shrink-0`]: props.loading || props.uniform,
    'px-3.5':
      (!props.loading && !props.uniform) ||
      (attrs.class as 'string')?.includes('w-full')
  };
});
</script>

<template>
  <AppLink v-if="to" :to="to" :class="classNames">
    <slot />
  </AppLink>
  <button
    v-else
    :type="type"
    :disabled="disabled || loading"
    :class="classNames"
  >
    <UiLoading v-if="loading" :inverse="primary" />
    <slot v-else />
  </button>
</template>

<style lang="scss" scoped>
.button {
  @apply rounded-full leading-[100%] border text-skin-link bg-skin-bg flex items-center justify-center gap-2;

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
