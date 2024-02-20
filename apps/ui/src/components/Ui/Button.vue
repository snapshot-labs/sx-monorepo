<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset';
    variant?: 'outlined' | 'primary' | 'danger' | 'success';
    circle?: boolean;
    loading?: boolean;
    disabled?: boolean;
  }>(),
  {
    type: 'button',
    variant: 'outlined',
    circle: false,
    loading: false,
    disabled: false
  }
);

const isPrimary = computed(() => props.variant === 'primary');
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      variant,
      {
        '!px-0 w-[46px] flex items-center justify-center': circle,
        'opacity-40 cursor-not-allowed': disabled || loading
      }
    ]"
    class="rounded-full leading-[100%] border button px-3.5 h-[46px] text-skin-link bg-skin-bg"
  >
    <UiLoading v-if="loading" :inverse="isPrimary" />
    <slot v-else />
  </button>
</template>

<style scoped lang="scss">
.button {
  &.primary {
    @apply bg-skin-link text-skin-bg border-skin-link;

    &:not(:disabled) {
      @apply hover:bg-opacity-85 active:bg-opacity-75;
    }
  }

  &.outlined {
    @apply text-skin-link;

    &:not(:disabled) {
      @apply hover:bg-skin-hover-bg active:bg-skin-active-bg;
    }
  }

  &.danger {
    @apply border-skin-danger-border text-skin-danger;

    &:not(:disabled) {
      @apply hover:bg-skin-danger-hover active:bg-skin-danger-active;
    }
  }

  &.success {
    @apply border-skin-success-border text-skin-success;

    &:not(:disabled) {
      @apply hover:bg-skin-success-hover active:bg-skin-success-active;
    }
  }
}
</style>
