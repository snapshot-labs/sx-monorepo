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
  (e: 'click');
}>();
</script>

<template>
  <button
    :disabled="disabled"
    class="button w-full text-left px-4 py-3 border-b last:border-b-0 text-skin-link space-x-2"
    :class="{}"
    @click="emit('click')"
  >
    <slot />
  </button>
</template>

<style scoped lang="scss">
.button {
  &:disabled {
    color: rgba(var(--border)) !important;
    cursor: not-allowed;
  }
}
</style>
