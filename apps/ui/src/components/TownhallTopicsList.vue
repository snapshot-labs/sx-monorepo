<script setup lang="ts">
import { Discussion } from '@/helpers/townhall/types';
import { _n } from '@/helpers/utils';

const props = defineProps<{
  title?: string;
  isError?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  topics: Discussion[];
  limit?: number | 'off';
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
              id: topic.id
            }
          }"
          class="py-3 mx-4 block border-b"
        >
          <div class="mb-1 flex">
            <ProposalIconStatus
              size="17"
              :state="topic.closed ? 'closed' : 'active'"
              class="top-1 mr-2"
            />
            <h4 class="text-[21px] leading-6" v-text="topic.title" />
          </div>
          <div class="text-skin-text">
            <UiStamp :id="topic.author" :size="20" class="mr-2.5" />
            <IH-annotation class="inline-block mr-0.5" />
            {{ _n(topic.statement_count) }} replies
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
    </div>
  </div>
</template>
