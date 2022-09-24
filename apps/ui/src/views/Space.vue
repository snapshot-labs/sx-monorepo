<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useSpacesStore } from '@/stores/spaces';

const route = useRoute();
const spacesStore = useSpacesStore();
const id = route.params.id as string;

onMounted(() => {
  spacesStore.fetchSpace(id);
});
</script>

<template>
  <div>
    <div
      class="invisible lg:visible fixed w-[240px] border-r top-0 bottom-0 z-10 bg-skin-bg"
    >
      <div class="h-[72px] border-b" />
      <Nav />
    </div>
    <div>
      <div class="ml-0 lg:ml-[240px] mr-0 xl:mr-[240px]">
        <UiLoading v-if="!spacesStore.spacesMap.has(id)" class="block p-4" />
        <router-view v-else :space="spacesStore.spacesMap.get(id)" />
      </div>
      <div
        class="invisible xl:visible fixed w-[240px] border-l bottom-0 top-[72px] right-0"
      />
    </div>
  </div>
</template>
