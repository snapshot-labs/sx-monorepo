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
    <div>
      <AppLink
        :to="task.link"
        class="inline"
        :class="{
          'text-skin-danger': task.type === 'error',
          'text-skin-link': task.type !== 'error'
        }"
        >{{ task.description }}</AppLink
      >
      <div
        v-if="task.totalSteps"
        class="text-skin-link inline-block bg-skin-border text-[13px] rounded-full px-1.5 ml-1"
      >
        {{ task.currentStep || 0 }}/{{ task.totalSteps }}
      </div>
    </div>
  </div>
</template>
