<script setup lang="ts">
import { Topic } from '@/helpers/discourse';

defineProps<{
  title?: string;
  loading?: boolean;
  topics: Topic[];
}>();
</script>

<template>
  <div>
    <UiSectionHeader v-if="title" :label="title" sticky />
    <UiLoading v-if="loading" class="block px-4 py-3" />
    <div v-else>
      <TopicsListItem v-for="(topic, i) in topics" :key="i" :topic="topic" />
      <div
        v-if="!topics.length"
        class="px-4 py-3 flex items-center space-x-2 text-skin-link"
      >
        <IH-exclamation-circle class="shrink-0" />
        <span v-text="'There are no topics here.'" />
      </div>
    </div>
  </div>
</template>
