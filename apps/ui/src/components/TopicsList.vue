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
    <UiLabel v-if="title" :label="title" sticky />
    <UiLoading v-if="loading" class="block px-4 py-3" />
    <div v-else>
      <TopicsListItem v-for="(topic, i) in topics" :key="i" :topic="topic" />
      <div
        v-if="!topics.length"
        class="px-4 py-3 flex items-center text-skin-link"
      >
        <IH-exclamation-circle class="inline-block mr-2" />
        <span v-text="'There are no topics here.'" />
      </div>
    </div>
  </div>
</template>
