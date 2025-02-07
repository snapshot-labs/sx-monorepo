<script setup lang="ts">
interface Task {
  description: string;
  link?: { name: string; params?: Record<string, any> };
  externalLink?: string;
  currentStep?: number;
  totalSteps?: number;
}

defineProps<{ task: Task }>();
</script>
<template>
  <div class="border-b mx-4 py-[14px] flex gap-x-2.5">
    <IS-flag class="text-skin-link mt-1 shrink-0" />
    <div>
      <template v-if="task.link">
        <AppLink :to="task.link">{{ task.description }}</AppLink>
      </template>
      <template v-else-if="task.externalLink">
        <a :href="task.externalLink" target="_blank">{{ task.description }}</a>
      </template>
      <template v-else>
        {{ task.description }}
      </template>
      <div
        v-if="!!task.currentStep && !!task.totalSteps"
        class="text-skin-link inline-block bg-skin-border text-[13px] rounded-full px-1.5 ml-1"
      >
        {{ task.currentStep }}/{{ task.totalSteps }}
      </div>
    </div>
  </div>
</template>
