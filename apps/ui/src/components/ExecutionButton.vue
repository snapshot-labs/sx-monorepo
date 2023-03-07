<script setup lang="ts">
withDefaults(
  defineProps<{
    disabled?: boolean;
  }>(),
  {
    disabled: false
  }
);

const emit = defineEmits<{
  disabled?: boolean;
  (e: 'click');
}>();
</script>

<template>
  <button
    :disabled="disabled"
    class="button px-4 py-3 border-b border rounded-lg block min-w-[165px] text-start text-skin-link"
    :class="{}"
    @click="emit('click')"
  >
    <slot />
  </button>
</template>

<style scoped lang="scss">
.button {
  &:disabled {
    color: var(--border-color) !important;
    cursor: not-allowed;
  }
}
</style>
