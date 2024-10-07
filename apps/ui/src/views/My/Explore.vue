<script setup lang="ts">
import { explorePageProtocols } from '@/networks';
import { ExplorePageProtocol, ProtocolConfig } from '@/networks/types';

const protocols = Object.values(explorePageProtocols).map(
  ({ key, label }: ProtocolConfig) => ({
    key,
    label
  })
);
const DEFAULT_PROTOCOL = 'snapshot';

const { setTitle } = useTitle();
const spacesStore = useSpacesStore();
const route = useRoute();
const router = useRouter();

const protocol = ref<ExplorePageProtocol>(DEFAULT_PROTOCOL);

watch(protocol, value => {
  router.push({ query: { ...route.query, p: value } });
});

watch(
  [() => route.query.q as string, () => route.query.p as string],
  ([searchQuery, protocolQuery]) => {
    const _protocol = (
      explorePageProtocols[protocolQuery] ? protocolQuery : DEFAULT_PROTOCOL
    ) as ExplorePageProtocol;

    protocol.value = _protocol;
    spacesStore.protocol = _protocol;
    spacesStore.fetch({ searchQuery });
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
        gap="12"
        placement="start"
        :items="protocols"
      />
    </div>
  </div>
  <div>
    <UiLabel label="Spaces" sticky />
    <UiLoading v-if="spacesStore.loading" class="block m-4" />
    <div v-else-if="spacesStore.loaded">
      <UiContainerInfiniteScroll
        v-if="spacesStore.explorePageSpaces.length"
        :loading-more="spacesStore.loadingMore"
        class="justify-center max-w-screen-md 2xl:max-w-screen-xl 3xl:max-w-screen-2xl mx-auto p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-explore-3 2xl:grid-cols-explore-4 3xl:grid-cols-explore-5 gap-3"
        @end-reached="
          spacesStore.fetchMore({ searchQuery: route.query.q as string })
        "
      >
        <SpacesListItem
          v-for="space in spacesStore.explorePageSpaces"
          :key="space.id"
          :space="space"
        />
      </UiContainerInfiniteScroll>
      <div v-else class="px-4 py-3 flex items-center space-x-2">
        <IH-exclamation-circle class="inline-block shrink-0" />
        <span>No results found for your search</span>
      </div>
    </div>
  </div>
</template>
