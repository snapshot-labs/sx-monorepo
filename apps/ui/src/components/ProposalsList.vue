<script setup lang="ts">
import { Proposal as ProposalType } from '@/types';

const props = withDefaults(
  defineProps<{
    title?: string;
    isError?: boolean;
    loading?: boolean;
    loadingMore?: boolean;
    limit?: number | 'off';
    proposals: ProposalType[];
    showSpace?: boolean;
    showAuthor?: boolean;
    route?: {
      name: string;
      linkTitle: string;
    };
  }>(),
  {
    showSpace: false,
    showAuthor: true
  }
);

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
    <UiSectionHeader v-if="title" :label="title" sticky />
    <UiLoading v-if="loading" class="block px-4 py-3" />
    <div
      v-else-if="isError"
      class="px-4 py-3 flex items-center text-skin-link gap-2"
    >
      <IH-exclamation-circle />
      <span v-text="'Failed to load proposals.'" />
    </div>
    <div v-else>
      <UiContainerInfiniteScroll
        :loading-more="loadingMore"
        @end-reached="emit('endReached')"
      >
        <ProposalsListItem
          v-for="(proposal, i) in proposals.slice(0, currentLimit)"
          :key="i"
          :proposal="proposal"
          :show-space="showSpace"
          :show-author="showAuthor"
        />
      </UiContainerInfiniteScroll>
      <div
        v-if="!proposals.length"
        class="px-4 py-3 flex items-center text-skin-link gap-2"
      >
        <IH-exclamation-circle />
        <span v-text="'There are no proposals here.'" />
      </div>
      <AppLink
        v-else-if="route && proposals.length > currentLimit"
        :to="{ name: route.name }"
        class="px-4 py-2 block"
      >
        {{ route.linkTitle }}
      </AppLink>
    </div>
  </div>
</template>
