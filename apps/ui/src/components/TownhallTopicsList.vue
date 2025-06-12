<script setup lang="ts">
import { Topic } from '@/helpers/townhall/types';
import { _n } from '@/helpers/utils';

const props = defineProps<{
  title?: string;
  isError?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  topics: Topic[];
  limit?: number | 'off';
  route?: {
    name: string;
    linkTitle: string;
  };
}>();

const emit = defineEmits<{
  (e: 'endReached');
}>();

const currentLimit = computed(() => {
  if (props.limit === 'off') return Infinity;

  return props.limit || 3;
});
</script>

<template>
  <div>
    <UiLabel v-if="title" :label="title" sticky />
    <UiLoading v-if="isLoading" class="block px-4 py-3" />
    <div
      v-else-if="isError"
      class="px-4 py-3 flex items-center text-skin-link gap-2"
    >
      <IH-exclamation-circle />
      <span v-text="'Failed to load topics.'" />
    </div>
    <div v-else>
      <UiContainerInfiniteScroll
        :loading-more="isLoadingMore"
        @end-reached="emit('endReached')"
      >
        <router-link
          v-for="(topic, i) in topics.slice(0, currentLimit)"
          :key="i"
          :to="{
            name: 'space-townhall-topic',
            params: {
              id: topic.topic_id
            }
          }"
          class="py-3 mx-4 block border-b"
        >
          <div class="mb-1 items-center gap-1 flex">
            <IS-lock-closed v-if="topic.closed" class="text-skin-text" />
            <h4 class="text-[21px] leading-6" v-text="topic.title" />
          </div>
          <div class="text-skin-text">
            <UiStamp :id="topic.author" :size="20" class="mr-2.5" />
            <IH-annotation class="inline-block mr-0.5" />
            {{ _n(topic.post_count) }} replies
          </div>
        </router-link>
      </UiContainerInfiniteScroll>
      <div
        v-if="!topics.length"
        class="px-4 py-3 flex items-center space-x-2 text-skin-link"
      >
        <IH-exclamation-circle class="shrink-0" />
        <span v-text="'There are no topics here.'" />
      </div>
      <AppLink
        v-else-if="route && topics.length > currentLimit"
        :to="{ name: route.name }"
        class="px-4 py-2 block"
      >
        {{ route.linkTitle }}
      </AppLink>
    </div>
  </div>
</template>
