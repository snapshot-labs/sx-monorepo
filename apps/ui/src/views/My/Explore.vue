import ProposalIconStatus from '@/components/ProposalIconStatus.vue';

<script setup lang="ts">
import { explorePageProtocols } from '../../networks';
import { ProtocolConfig } from '../../networks/types';

const { setTitle } = useTitle();
const spacesStore = useSpacesStore();
watchEffect(() => setTitle('Explore'));
onMounted(() => spacesStore.fetch());
const protocols = Object.values(explorePageProtocols).map((protocol: ProtocolConfig) => ({
  key: protocol.key,
  label: protocol.label
}));
</script>

<template>
  <div class="flex justify-between">
    <div class="flex flex-row p-4 space-x-2">
      <UiSelectDropdown
        v-model="spacesStore.protocol"
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
          @end-reached="spacesStore.fetchMore"
        >
          <SpacesListItem v-for="space in spacesStore.spaces" :key="space.id" :space="space" />
          <div></div>
          <!-- Empty div make the loader inside infinite scroll align center -->
        </UiContainerInfiniteScroll>
      </div>
    </div>
  </div>
</template>
