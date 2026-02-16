<script setup lang="ts">
import { Task } from '@/types';

defineProps<{ task: Task }>();
</script>
<template>
  <div
    class="border-b mx-4 py-[14px] flex gap-x-2.5"
    :class="{
      'text-skin-danger': task.type === 'error',
      'text-skin-link': task.type !== 'error'
    }"
  >
    <IH-information-circle v-if="task.type === 'error'" class="mt-1 shrink-0" />
    <IS-flag v-else class="mt-1 shrink-0" />
    <div class="gap-2">
      <AppLink
        :to="task.link"
        class="inline"
        :class="{
          'text-skin-danger': task.type === 'error',
          'text-skin-link': task.type !== 'error'
        }"
        >{{ task.description }}</AppLink
      >
      <UiPill v-if="task.totalSteps">
        {{ task.currentStep || 0 }}/{{ task.totalSteps }}
      </UiPill>
    </div>
  </div>
</template>
