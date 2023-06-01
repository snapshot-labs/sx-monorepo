<script setup lang="ts">
import { NotificationType } from '@/types';

defineProps<{
  type: NotificationType;
  dismissable?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close');
}>();
</script>

<template>
  <div
    class="flex gap-2 justify-between items-center w-full py-2 px-3 rounded border text-sm"
    :class="{
      'bg-rose-100 border-rose-300 text-rose-500 dark:bg-rose-700 dark:border-rose-700 dark:text-neutral-100':
        type === 'error',
      'bg-yellow-100 border-yellow-300 text-yellow-600 dark:bg-amber-500 dark:border-amber-500 dark:text-neutral-100':
        type === 'warning',
      'bg-lime-100 border-lime-300 text-lime-600 dark:bg-emerald-500 dark:border-emerald-500 dark:text-neutral-100':
        type === 'success'
    }"
  >
    <slot />
    <a
      v-if="dismissable"
      class="text-skin-link opacity-50 hover:opacity-100"
      @click="emit('close')"
    >
      <IH-x />
    </a>
  </div>
</template>
