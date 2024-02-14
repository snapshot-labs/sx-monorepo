<script setup lang="ts">
import { NotificationType } from '@/types';

defineProps<{
  type: NotificationType;
}>();
</script>

<template>
  <div
    class="flex items-center w-full rounded-lg border relative"
    :class="{
      'border-skin-danger-border': type === 'error',
      'border-skin-border': type === 'warning',
      'border-skin-success-border': type === 'success'
    }"
  >
    <div
      class="w-[56px] flex justify-center items-center rounded-l-lg absolute top-0 bottom-0"
      :class="[
        {
          'bg-skin-danger-active': type === 'error',
          'bg-skin-active-bg': type === 'warning',
          'bg-skin-success-active': type === 'success'
        }
      ]"
    >
      <div
        :class="[
          {
            'text-skin-danger': type === 'error',
            'text-skin-heading': type === 'warning',
            'text-skin-success': type === 'success'
          }
        ]"
      >
        <IH-exclamation v-if="type === 'error'" />
        <IH-exclamation-circle v-else-if="type === 'warning'" />
        <IH-sparkles v-else-if="type === 'success'" />
      </div>
    </div>
    <div class="text-skin-heading pr-3.5 pl-[76px] py-3 leading-6">
      <slot />
    </div>
  </div>
</template>
