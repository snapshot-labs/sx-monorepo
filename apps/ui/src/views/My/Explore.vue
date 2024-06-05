<script setup lang="ts">
import { explorePageProtocols } from '../../networks';
import { ExplorePageProtocol, ProtocolConfig } from '../../networks/types';

const protocols = Object.values(explorePageProtocols).map(({ key, label }: ProtocolConfig) => ({
  key,
  label
}));

const { setTitle } = useTitle();
const spacesStore = useSpacesStore();
const route = useRoute();

const protocol = ref<ExplorePageProtocol>('snapshot');

watch(
  [() => route.query.q as string, () => protocol.value],
  ([query, protocol]) => {
    spacesStore.protocol = protocol;
    spacesStore.fetch({ searchQuery: query });
  },
  {
    immediate: true
  }
);

watchEffect(() => setTitle('Explore'));
</script>

<template>
  <div class="flex justify-between">
    <div class="flex flex-row p-4 space-x-2">
      <UiSelectDropdown
        v-model="protocol"
        title="Protocol"
        gap="12px"
        placement="left"
        :items="protocols"
      />
    </div>
  </div>
  <div>
    <UiLabel label="Spaces" sticky />
    <UiLoading v-if="spacesStore.loading" class="block m-4" />
    <div v-else-if="spacesStore.loaded" class="max-w-screen-md mx-auto p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        <UiContainerInfiniteScroll
          :loading-more="spacesStore.loadingMore"
          @end-reached="spacesStore.fetchMore({ searchQuery: route.query.q as string })"
        >
          <SpacesListItem
            v-for="space in spacesStore.explorePageSpaces"
            :key="space.id"
            :space="space"
          />
        </UiContainerInfiniteScroll>
      </div>
    </div>
  </div>
</template>
