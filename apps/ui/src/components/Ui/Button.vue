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

const isCompact = computed(() => {
  const isFullWidth = (attrs.class as 'string')?.includes('w-full');

  return (props.loading || props.uniform) && !isFullWidth;
});

const classNames = computed(() => {
  return {
    button: true,
    primary: props.primary,
    'px-0 shrink-0': isCompact.value,
    'px-3.5': !isCompact.value
  };
});

const buttonStyles = computed(() => {
  return {
    height: `${props.size}px`,
    minWidth: `${props.size}px`,
    width: isCompact.value ? `${props.size}px` : undefined
  };
});
</script>

<template>
  <AppLink v-if="to" :to="to" :class="classNames" :style="buttonStyles">
    <slot />
  </AppLink>
  <button
    v-else
    :type="type"
    :disabled="disabled || loading"
    :class="classNames"
    :style="buttonStyles"
  >
    <UiLoading v-if="loading" :inverse="primary" />
    <slot v-else />
  </button>
</template>

<style lang="scss" scoped>
.button {
  @apply rounded-full leading-[100%] border text-skin-link bg-skin-bg inline-flex items-center justify-center gap-2;

  &:disabled:deep() {
    color: rgba(var(--border));
    cursor: not-allowed;
  }

  &.text-skin-danger:disabled {
    color: rgba(var(--danger)) !important;
  }

  &.text-skin-success:disabled {
    color: rgba(var(--success)) !important;
  }

  &.text-skin-text:disabled {
    color: rgba(var(--text)) !important;
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
