<script setup lang="ts">
import { useUiStore } from '@/stores/ui';
import { useSpacesStore } from '@/stores/spaces';
import type { NetworkID } from '@/types';

const uiStore = useUiStore();
const route = useRoute();
const spacesStore = useSpacesStore();
const id = route.params.id as string;
const [networkId, spaceId] = id.split(':');

onMounted(() => {
  spacesStore.fetchSpace(spaceId, networkId as NetworkID);
});
</script>

<template>
  <div>
    <div>
      <div
        class="ml-0 lg:ml-[240px] mr-0 xl:mr-[240px]"
        :class="{ 'translate-x-[240px] lg:translate-x-0': uiStore.sidebarOpen }"
      >
        <UiLoading v-if="!spacesStore.spacesMap.has(id)" class="block p-4" />
        <router-view v-else :space="spacesStore.spacesMap.get(id)" />
      </div>
      <div class="invisible xl:visible fixed w-[240px] border-l bottom-0 top-[72px] right-0" />
    </div>
  </div>
</template>
