<script setup lang="ts">
import type { Proposal as ProposalType } from '@/types';

const props = defineProps<{
  title: string;
  loading?: boolean;
  loadingMore?: boolean;
  limit?: number | 'off';
  proposals: ProposalType[];
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
    <Label :label="title" sticky />
    <UiLoading v-if="loading" class="block px-4 py-3" />
    <div v-else>
      <BlockInfiniteScroller :loading-more="loadingMore" @end-reached="emit('endReached')">
        <Proposal
          v-for="(proposal, i) in proposals.slice(0, currentLimit)"
          :key="i"
          :proposal="proposal"
        />
      </BlockInfiniteScroller>
      <div v-if="!proposals.length" class="px-4 py-3 flex items-center text-skin-link">
        <IH-exclamation-circle class="inline-block mr-2" />
        <span v-text="'There are no proposals here.'" />
      </div>
      <router-link
        v-else-if="route && proposals.length > currentLimit"
        :to="{ name: route.name }"
        class="px-4 py-2 block"
      >
        {{ route.linkTitle }}
      </router-link>
    </div>
  </div>
</template>
