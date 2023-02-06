<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSpacesStore } from '@/stores/spaces';

const spacesStore = useSpacesStore();

const infiniteScrollEnabled = ref(false);

function handleEndReached() {
  if (!spacesStore.hasMoreSpaces) return;

  spacesStore.fetchMore();
}

onMounted(() => spacesStore.fetch());
</script>

<template>
  <div>
    <div class="py-8 mb-6 border-b hero">
      <Container class="max-w-screen-md">
        <div class="eyebrow mb-3" v-text="'Snapshot X'" />
        <h1 class="mb-5 mono">Where decisions<br />get made.</h1>
        <router-link :to="{ name: 'create' }">
          <UiButton>Create new space</UiButton>
        </router-link>
      </Container>
    </div>
    <Container class="max-w-screen-md">
      <h3 class="mb-2" v-text="'Spaces'" />
      <UiLoading v-if="!spacesStore.loaded" class="block mb-2" />
    </Container>
    <Container v-if="spacesStore.loaded" class="max-w-screen-md" slim>
      <div class="x-block mb-3">
        <BlockInfiniteScroller
          :enabled="infiniteScrollEnabled"
          :loading-more="spacesStore.loadingMore"
          @end-reached="handleEndReached"
        >
          <router-link
            v-for="space in spacesStore.spaces"
            :key="space.id"
            :to="{ name: 'overview', params: { id: `${space.network}:${space.id}` } }"
            class="p-4 text-skin-text border-b last-of-type:border-b-0 block"
          >
            <div class="mb-2 flex items-center space-x-2">
              <Stamp
                :id="space.id"
                :size="24"
                class="inline-block border-skin-bg !bg-skin-bg rounded-sm"
              />
              <h4 class="inline-block" v-text="space.name" />
              <span class="font-mono bg-neutral-600 text-white text-xs rounded px-2">{{
                space.network
              }}</span>
            </div>
            <div>
              <b class="text-skin-link" v-text="space.proposal_count" /> proposals ·
              <b class="text-skin-link" v-text="space.vote_count" /> votes
            </div>
          </router-link>
          <template #loading>
            <div class="flex justify-center border-t">
              <UiLoading class="block px-4 py-3" />
            </div>
          </template>
        </BlockInfiniteScroller>
      </div>
      <UiButton
        v-if="!infiniteScrollEnabled && spacesStore.hasMoreSpaces"
        class="w-full"
        @click="infiniteScrollEnabled = true"
        >Load more</UiButton
      >
    </Container>
  </div>
</template>
