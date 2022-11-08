<script setup lang="ts">
import { onMounted } from 'vue';
import { useSpacesStore } from '@/stores/spaces';

const spacesStore = useSpacesStore();

onMounted(() => spacesStore.fetchAll());
</script>

<template>
  <div>
    <div class="py-8 mb-6 border-b hero">
      <Container class="max-w-screen-md">
        <div class="eyebrow mb-3" v-text="'Snapshot X'" />
        <h1 class="mb-5 mono">Where decisions<br />get made.</h1>
      </Container>
    </div>
    <Container class="max-w-screen-md">
      <h3 class="mb-2" v-text="'Spaces'" />
      <UiLoading v-if="!spacesStore.loaded" class="block mb-2" />
    </Container>
    <Container v-if="spacesStore.loaded" class="max-w-screen-md" slim>
      <div class="x-block mb-3">
        <router-link
          v-for="space in spacesStore.spaces"
          :key="space.id"
          :to="{ name: 'overview', params: { id: space.id } }"
          class="p-4 text-skin-text border-b last:border-b-0 block"
        >
          <div class="mb-2 flex items-center space-x-2">
            <Stamp
              :id="space.id"
              :size="24"
              class="inline-block border-skin-bg !bg-skin-bg rounded-sm"
            />
            <h4 class="inline-block" v-text="space.name" />
          </div>
          <div>
            <b class="text-skin-link" v-text="space.proposal_count" /> proposals
            · <b class="text-skin-link" v-text="space.vote_count" /> votes
          </div>
        </router-link>
      </div>
    </Container>
    <Container class="max-w-screen-md">
      <router-link
        :to="{
          name: 'editor',
          params: { id: spacesStore.spaces[0]?.id || '0' }
        }"
        class="mb-2 block"
      >
        <h3 v-text="'Editor'" />
      </router-link>
      <a
        href="https://github.com/snapshot-labs?q=sx&type=all&language=&sort="
        target="_blank"
        class="mb-2 block"
      >
        <h3>
          GitHub
          <IH-external-link class="inline-block" />
        </h3>
      </a>
    </Container>
  </div>
</template>
