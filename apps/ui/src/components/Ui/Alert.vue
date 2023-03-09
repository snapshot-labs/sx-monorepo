<script setup lang="ts">
defineProps<{
  type: 'error';
}>();
</script>

<template>
  <div
    class="w-full py-2 px-3 mb-4 rounded border text-sm"
    :class="{
      'bg-rose-100 border-rose-300 text-rose-500 dark:bg-rose-700 dark:border-rose-700 dark:text-neutral-100':
        type === 'error'
    }"
  >
    <slot />
  </div>
</template>
