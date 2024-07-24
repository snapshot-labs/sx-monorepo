<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset';
    primary?: boolean;
    loading?: boolean;
    disabled?: boolean;
    simple?: boolean;
  }>(),
  {
    type: 'button',
    primary: false,
    loading: false,
    disabled: false,
    simple: false
  }
);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="s-button"
    :class="{
      '!border-0 !px-0 !h-auto': simple,
      'min-w-[46px]': !simple,
      primary: primary
    }"
  >
    <UiLoading v-if="loading" :inverse="primary" />
    <slot v-else />
  </button>
</template>
