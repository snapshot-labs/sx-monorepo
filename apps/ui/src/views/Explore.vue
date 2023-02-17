<script setup lang="ts">
import { onMounted } from 'vue';
import { useSpacesStore } from '@/stores/spaces';

const spacesStore = useSpacesStore();

onMounted(() => spacesStore.fetch());
</script>

<template>
  <div>
    <Container class="max-w-screen-md pt-5">
      <h2 class="mb-4 mono !text-xl" v-text="'Explore'" />
      <UiLoading v-if="!spacesStore.loaded" class="block mb-2" />
      <div v-if="spacesStore.loaded" class="max-w-screen-md">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          <router-link
            v-for="space in spacesStore.spaces"
            :key="space.id"
            :to="{ name: 'overview', params: { id: `${space.network}:${space.id}` } }"
            class="p-4 text-skin-text border rounded-lg block h-[240px] relative"
          >
            <Stamp
              :id="space.id"
              :size="32"
              class="border-skin-bg !bg-skin-border rounded-sm mb-2"
            />
            <h3 v-text="space.name" />
            <h5 class="absolute bottom-4">
              <b class="text-skin-link" v-text="space.proposal_count" /> proposals ·
              <b class="text-skin-link" v-text="space.vote_count" /> votes
            </h5>
            <h5 v-text="space.about" />
          </router-link>
        </div>
      </div>
    </Container>
  </div>
</template>
