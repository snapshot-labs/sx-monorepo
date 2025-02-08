<script setup lang="ts">
import { RouteLocationRaw } from 'vue-router';

type Task = {
  description: string;
  link?: RouteLocationRaw;
  currentStep?: number;
  totalSteps?: number;
};

defineProps<{ task: Task }>();
</script>
<template>
  <div class="border-b mx-4 py-[14px] flex gap-x-2.5">
    <IS-flag class="text-skin-link mt-1 shrink-0" />
    <div>
      <AppLink :to="task.link" class="inline">{{ task.description }}</AppLink>
      <div
        v-if="task.totalSteps"
        class="text-skin-link inline-block bg-skin-border text-[13px] rounded-full px-1.5 ml-1"
      >
        {{ task.currentStep || 0 }}/{{ task.totalSteps }}
      </div>
    </div>
  </div>
</template>
