<script setup lang="ts">
import { Button } from '@ui-sdk/vue/button';
import type { RouteLocationRaw } from 'vue-router';
import { omit } from '../../helpers/utils';
import { TUNE_OPTIONS_KEY } from '../../plugin';

defineOptions({ inheritAttrs: false });

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
const { linkComponent = 'a' } = inject(TUNE_OPTIONS_KEY, {});

// Calls the click handlers without returning their Promise: UI SDK would
// keep the button pending until it settles, and ignore presses meanwhile
function click(event: MouseEvent) {
  for (const handler of [attrs.onClick].flat()) {
    (handler as ((event: MouseEvent) => unknown) | undefined)?.(event);
  }
}

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
  <component
    :is="linkComponent"
    v-if="to"
    v-bind="attrs"
    :to="to"
    :class="classNames"
    :style="buttonStyles"
  >
    <slot />
  </component>
  <Button
    v-else
    v-bind="omit(attrs, ['onClick'])"
    :type="type"
    :disabled="disabled || loading"
    :class="classNames"
    :style="buttonStyles"
    @click="click"
  >
    <UiLoading v-if="loading" :inverse="primary" />
    <slot v-else />
  </Button>
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
    @apply bg-skin-primary text-skin-accent-foreground border-skin-primary;

    &:disabled:deep() {
      @apply bg-skin-primary/40 border-transparent;

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
