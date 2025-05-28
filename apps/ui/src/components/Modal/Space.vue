<script setup lang="ts">
import { useExploreSpacesQuery } from '@/queries/spaces';
import { Space } from '@/types';

const props = defineProps<{
  open: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'pick', space: Space): void;
}>();

const searchQuery = ref<string>('');
const throttledSearchQuery = refThrottled(searchQuery, 500);

const { data, isPending, isFetchingNextPage, hasNextPage, fetchNextPage } =
  useExploreSpacesQuery({
    searchQuery: throttledSearchQuery,
    protocol: 'snapshot',
    network: 'all',
    category: 'all'
  });

function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}

watch(
  () => props.open,
  open => {
    if (!open) {
      searchQuery.value = '';
    }
  }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Select a space'" />
      <div class="flex items-center border-t px-2 py-3 mt-3 -mb-3">
        <IH-search class="mx-2" />
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          placeholder="Search"
          class="flex-auto bg-transparent text-skin-link"
        />
      </div>
    </template>
    <div>
      <UiLoading v-if="isPending" class="inline-block p-4" />
      <template v-else-if="data">
        <UiContainerInfiniteScroll
          v-if="data.pages.flat().length"
          :loading-more="isFetchingNextPage"
          class="justify-center max-w-screen-md mx-auto"
          @end-reached="handleEndReached"
        >
          <button
            v-for="space in data.pages.flat()"
            :key="space.id"
            type="button"
            :space="space"
            class="flex items-center space-x-3 truncate px-4 py-3 border-b w-full"
            @click="$emit('pick', space)"
          >
            <div class="shrink-0">
              <SpaceAvatar :space="space" :size="32" class="!rounded-[4px]" />
            </div>
            <div class="space-x-1 flex items-center truncate">
              <span class="truncate text-skin-link" v-text="space.name" />
              <UiBadgeVerified
                :verified="space.verified"
                :turbo="space.turbo"
                class="shrink-0"
              />
            </div>
          </button>
        </UiContainerInfiniteScroll>
        <div v-else class="flex items-center space-x-2 m-4">
          <IH-exclamation-circle class="inline-block shrink-0" />
          <span>No results found for your search</span>
        </div>
      </template>
    </div>
  </UiModal>
</template>
