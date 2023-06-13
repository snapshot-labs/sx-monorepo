<script setup lang="ts">
import { useSpacesStore } from '@/stores/spaces';

const { setTitle } = useTitle();
const spacesStore = useSpacesStore();

onMounted(() => spacesStore.fetch());

watchEffect(() => {
  setTitle('Explore');
});
</script>

<template>
  <div>
    <Container class="max-w-screen-md pt-5">
      <h2 class="mb-4 mono !text-xl" v-text="'Explore'" />
      <UiLoading v-if="!spacesStore.loaded" class="block mb-2" />
      <div v-if="spacesStore.loaded" class="max-w-screen-md">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          <SpaceItem v-for="space in spacesStore.spaces" :key="space.id" :space="space" />
        </div>
      </div>
    </Container>
  </div>
</template>
